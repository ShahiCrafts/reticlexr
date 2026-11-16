package com.capacitor.arcore.render;

import android.content.Context;
import android.opengl.GLES20;
import android.util.Log;
import android.view.SurfaceHolder;

import com.google.ar.core.Frame;
import com.google.ar.core.TrackingState;
import com.google.ar.core.exceptions.CameraNotAvailableException;

import com.google.android.filament.Engine;
import com.google.android.filament.Renderer;
import com.google.android.filament.Scene;
import com.google.android.filament.View;
import com.google.android.filament.Camera;
import com.google.android.filament.SwapChain;
import com.google.android.filament.Entity;
import com.google.android.filament.EntityManager;
import com.capacitor.arcore.session.ARSessionManager;
import com.capacitor.arcore.surface.ARSurfaceManager;
import com.capacitor.arcore.events.AREventEmitter;
import com.capacitor.arcore.interaction.ARCoordinateMapper;
import com.capacitor.arcore.anchor.ARAnchorManager;
import com.capacitor.arcore.view.ARNativeView;
import com.getcapacitor.JSObject;

import java.util.Queue;
import java.util.concurrent.ConcurrentLinkedQueue;

/**
 * ARRenderer
 *
 * Unified AR frame loop and Filament rendering pipeline.
 *
 * Responsibilities:
 * - Initialize Filament engine and rendering resources
 * - Own and drive the frame loop
 * - Manage SwapChain lifecycle
 * - Update Filament camera from ARCore
 * - Render camera background from ARCore texture
 * - Coordinate surface updates
 * - Handle rendering errors
 *
 * Architecture:
 * - Single frame loop runs on render thread
 * - ARSessionManager.acquireLatestFrame() called once per frame
 * - All rendering state derives from one coherent Frame
 * - No producer/consumer pipelining
 *
 * Thread model:
 * - Constructor/init: UI thread
 * - Frame loop: Render thread (created by SurfaceView)
 * - onSurfaceCreated/Changed/Destroyed: Any thread (SurfaceHolder callbacks)
 * - pause/resume: UI thread
 */
public class ARRenderer implements ARNativeView.ARViewRenderer {

  private static final String TAG = "ARRenderer";

  private static final float NEAR_PLANE = 0.01f;
  private static final float FAR_PLANE = 100.0f;

  // State flags
  private volatile boolean isSessionReady = false;
  private volatile boolean isSurfaceValid = false;
  private volatile boolean isPaused = false;

  // Render thread
  private Thread renderThread;

  // Dependencies (not owned)
  private ARSessionManager sessionManager;
  private ARSurfaceManager surfaceManager;
  private AREventEmitter eventEmitter;
  private ARCoordinateMapper coordinateMapper;
  private ARAnchorManager anchorManager;

  // NAT-07: plugin hit tests are queued here and drained by the render
  // loop against the frame it just acquired. Session.update() therefore
  // runs only on the render thread, a Frame is never handed to another
  // thread, and every queued request is completed on the render thread
  // (including anchor creation — NAT-04).
  private final Queue<HitTestRequest> hitTestQueue = new ConcurrentLinkedQueue<>();
  private final Object hitTestLock = new Object();
  private volatile boolean isLoopRunning = false;

  // Display
  private int viewportWidth = 0;
  private int viewportHeight = 0;

  // Filament resources (actual Filament implementation)
  private com.google.android.filament.Engine filamentEngine;
  private com.google.android.filament.Renderer filamentRenderer;
  private com.google.android.filament.View filamentView;
  private com.google.android.filament.Scene filamentScene;
  private com.google.android.filament.Camera filamentCamera;
  private com.google.android.filament.SwapChain filamentSwapChain;
  private int cameraEntity;  // Entity for camera background quad
  private ARCoreTextureBackground cameraBackground;

  // Tracking state for events
  private TrackingState lastTrackingState = null;

  public ARRenderer(Context context) {
    try {
      initializeFilament(context);
      Log.d(TAG, "ARRenderer initialized");
    } catch (Exception e) {
      Log.e(TAG, "Failed to initialize Filament", e);
    }
  }

  /**
   * Initialize Filament engine and rendering resources.
   *
   * UI thread
   */
  private void initializeFilament(Context context) {
    try {
      // Create Filament engine (singleton)
      filamentEngine = Engine.create();

      // Create renderer (draws to SwapChain)
      filamentRenderer = filamentEngine.createRenderer();

      // Create scene
      filamentScene = filamentEngine.createScene();

      // Create view
      filamentView = filamentEngine.createView();
      filamentView.setScene(filamentScene);

      // Create camera entity
      EntityManager entityManager = filamentEngine.getEntityManager();
      cameraEntity = entityManager.create();
      filamentCamera = filamentEngine.createCamera(cameraEntity);
      filamentView.setCamera(filamentCamera);

      // Create camera background renderable (for ARCore texture)
      cameraBackground = new ARCoreTextureBackground(context, filamentEngine, filamentScene);

      Log.d(TAG, "Filament initialized successfully");

    } catch (Exception e) {
      Log.e(TAG, "Failed to initialize Filament", e);
      throw new RuntimeException("Filament initialization failed: " + e.getMessage());
    }
  }

  /**
   * Set dependencies.
   *
   * Called by ARCorePlugin during initialization.
   * UI thread
   */
  public void setSessionManager(ARSessionManager manager) {
    this.sessionManager = manager;
  }

  public void setSurfaceManager(ARSurfaceManager manager) {
    this.surfaceManager = manager;
  }

  public void setEventEmitter(AREventEmitter emitter) {
    this.eventEmitter = emitter;
  }

  public void setCoordinateMapper(ARCoordinateMapper mapper) {
    this.coordinateMapper = mapper;
  }

  public void setAnchorManager(ARAnchorManager manager) {
    this.anchorManager = manager;
  }

  // ========== Hit-test request queue (NAT-07) ==========

  /**
   * Completion for a queued hit test. Always invoked on the render
   * thread: either from the per-frame drain, or from the loop-exit
   * drain with a non-null error.
   */
  public interface HitTestCallback {
    /**
     * @param hit the hit result, or null when nothing was hit / on error
     * @param anchorId real ARCore anchor id created from the hit
     *                 (NAT-04), or null when no hit / no anchor manager
     * @param error non-null when the request could not be served
     */
    void onHitTestComplete(
        ARCoordinateMapper.HitTestResult hit, String anchorId, String error);
  }

  private static class HitTestRequest {
    final float x; // normalized [0, 1]
    final float y; // normalized [0, 1]
    final HitTestCallback callback;

    HitTestRequest(float x, float y, HitTestCallback callback) {
      this.x = x;
      this.y = y;
      this.callback = callback;
    }
  }

  /**
   * Queue a hit test for the render loop (NAT-07).
   *
   * Any thread. The request is served by the render loop against the
   * frame it owns; the callback fires on the render thread.
   *
   * @return false when the render loop is not running — the caller must
   *         complete the request itself instead of queueing it into a
   *         void (the promise must never hang)
   */
  public boolean submitHitTest(float x, float y, HitTestCallback callback) {
    // Check-and-enqueue under one lock with the loop-exit path, so a
    // request can never be queued after the final drain has run.
    synchronized (hitTestLock) {
      if (!isLoopRunning) {
        return false;
      }
      hitTestQueue.add(new HitTestRequest(x, y, callback));
      return true;
    }
  }

  /**
   * Serve every queued hit test against this frame.
   *
   * Render thread only (called from the render loop). Anchor creation
   * (HitResult.createAnchor) also happens here, on the render thread,
   * as NAT-04/NAT-07 require for anything touching the Session.
   */
  private void processPendingHitTests(Frame frame) {
    HitTestRequest request;
    while ((request = hitTestQueue.poll()) != null) {
      try {
        ARCoordinateMapper.HitTestResult hit =
            coordinateMapper != null
                ? coordinateMapper.screenToWorldHitTest(request.x, request.y, frame)
                : null;

        String anchorId = null;
        if (hit != null && hit.hitResult != null && anchorManager != null) {
          com.google.ar.core.Anchor anchor = hit.hitResult.createAnchor();
          anchorId = anchorManager.registerAnchor(anchor);
        }

        request.callback.onHitTestComplete(hit, anchorId, null);
      } catch (Exception e) {
        Log.e(TAG, "Queued hit test failed", e);
        request.callback.onHitTestComplete(null, null, e.getMessage());
      }
    }
  }

  /**
   * Fail every queued hit test. Render thread only (loop exit), so a
   * stopping loop never leaves a plugin promise hanging.
   */
  private void failPendingHitTests(String error) {
    HitTestRequest request;
    while ((request = hitTestQueue.poll()) != null) {
      request.callback.onHitTestComplete(null, null, error);
    }
  }

  /**
   * Signal that ARCore session is ready.
   *
   * Called by ARSessionManager after createSession() completes.
   * UI thread
   */
  public void onSessionReady() {
    isSessionReady = true;
    startRenderLoopIfReady();
    Log.d(TAG, "Session ready");
  }

  /**
   * Signal activity pause.
   *
   * Called during Activity.onPause()
   * UI thread
   */
  public void onActivityPaused() {
    isPaused = true;
    stopRenderLoop();
    Log.d(TAG, "Activity paused");
  }

  /**
   * Signal activity resume.
   *
   * Called during Activity.onResume()
   * UI thread
   */
  public void onActivityResumed() {
    isPaused = false;
    startRenderLoopIfReady();
    Log.d(TAG, "Activity resumed");
  }

  /**
   * Signal session closed.
   *
   * Called by ARViewManager during removeARView()
   * UI thread
   */
  public void onSessionClosed() {
    isSessionReady = false;
    stopRenderLoop();
    Log.d(TAG, "Session closed");
  }

  // ========== SurfaceHolder.Callback Implementation ==========

  @Override
  public void onSurfaceCreated(SurfaceHolder holder) {
    Log.d(TAG, "onSurfaceCreated");
    isSurfaceValid = true;

    try {
      if (filamentEngine == null) {
        throw new RuntimeException("Filament engine not initialized");
      }

      // Create Filament SwapChain on the native surface
      filamentSwapChain = filamentEngine.createSwapChain(holder.getSurface());

      startRenderLoopIfReady();

    } catch (Exception e) {
      Log.e(TAG, "Error creating SwapChain", e);
      emitError("SWAPCHAIN_CREATE_FAILED", e.getMessage());
    }
  }

  @Override
  public void onSurfaceChanged(int width, int height) {
    Log.d(TAG, "onSurfaceChanged: " + width + "x" + height);
    viewportWidth = width;
    viewportHeight = height;

    // Filament 1.52.0: setViewport removed, DisplayInfo not needed
    // Filament automatically uses the SwapChain surface dimensions
    // No explicit viewport setting required
  }

  @Override
  public void onSurfaceDestroyed() {
    Log.d(TAG, "onSurfaceDestroyed");
    isSurfaceValid = false;
    stopRenderLoop();

    // Wait for render loop to finish
    if (renderThread != null) {
      try {
        renderThread.join(2000);
      } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
      }
    }

    // Destroy SwapChain using Filament 1.52.0 API
    if (filamentSwapChain != null && filamentEngine != null) {
      filamentEngine.destroySwapChain(filamentSwapChain);
      filamentSwapChain = null;
    }
  }

  // ========== Render Loop Control ==========

  /**
   * Start render loop if all conditions are met.
   *
   * Synchronized to ensure only one loop starts.
   */
  private synchronized void startRenderLoopIfReady() {
    if (isSessionReady && isSurfaceValid && !isPaused && renderThread == null) {
      renderThread = new Thread(() -> {
        try {
          renderLoop();
        } finally {
          renderThread = null;
        }
      });
      renderThread.setName("ARRenderThread");
      renderThread.start();
      Log.d(TAG, "Render loop started");
    }
  }

  /**
   * Signal render loop to stop.
   */
  private void stopRenderLoop() {
    isPaused = true;
  }

  /**
   * Main unified frame loop.
   *
   * Runs on render thread.
   * Single loop: update + render per frame
   */
  private void renderLoop() {
    synchronized (hitTestLock) {
      isLoopRunning = true;
    }
    while (isSessionReady && isSurfaceValid && !isPaused) {
      try {
        // ========== STEP 1: FRAME ACQUISITION ==========
        // Get one coherent ARCore frame (calls Session.update() once)
        Frame arFrame = sessionManager.acquireLatestFrame();

        if (arFrame == null) {
          Thread.sleep(5);
          continue;
        }

        // ========== STEP 1b: QUEUED HIT TESTS (NAT-07) ==========
        // Serve plugin hit tests against this frame, on this thread.
        processPendingHitTests(arFrame);

        // ========== STEP 2: TRACKING STATE ==========
        com.google.ar.core.Camera arCamera = arFrame.getCamera();
        TrackingState trackingState = arCamera.getTrackingState();

        // Emit tracking state changes (only on change, not every frame)
        updateTrackingState(trackingState);

        // ========== STEP 3: SURFACES ==========
        if (surfaceManager != null) {
          surfaceManager.updatePlanes(arFrame);
        }

        // ========== STEP 4: CAMERA POSE & PROJECTION ==========
        float[] viewMatrix = new float[16];
        float[] projMatrix = new float[16];
        arCamera.getViewMatrix(viewMatrix, 0);
        // ARCore 1.40.0: getProjectionMatrix(float[], int, float, float)
        // Parameters: projMatrix array, offset=0, near plane, far plane
        arCamera.getProjectionMatrix(projMatrix, 0, NEAR_PLANE, FAR_PLANE);

        // ========== STEP 5: CAMERA BACKGROUND TEXTURE ==========
        // Update camera background with latest frame's camera texture
        if (cameraBackground != null) {
          cameraBackground.updateFromFrame(arFrame);
        }

        // ========== STEP 6: FILAMENT CAMERA UPDATE ==========
        if (filamentCamera != null) {
          // Apply view matrix from ARCore
          filamentCamera.setModelMatrix(viewMatrix);
          
          // Filament 1.52.0: setCustomProjection requires double[] and double near/far
          // Convert float arrays and planes to double arrays
          double[] projMatrixDouble = new double[16];
          for (int i = 0; i < 16; i++) {
            projMatrixDouble[i] = projMatrix[i];
          }
          filamentCamera.setCustomProjection(projMatrixDouble, (double) NEAR_PLANE, (double) FAR_PLANE);
        }

        // ========== STEP 7: FILAMENT RENDERING ==========
        if (filamentRenderer != null && filamentView != null) {
          // Filament 1.52.0: beginFrame requires SwapChain and timestamp
          long frameTimeNs = System.nanoTime();
          filamentRenderer.beginFrame(filamentSwapChain, frameTimeNs);
          filamentView.setCamera(filamentCamera);
          filamentRenderer.render(filamentView);
          filamentRenderer.endFrame();
        }

        // ========== CLEANUP ==========
        // ARCore 1.40.0: Frame.release() does not exist
        // Frames are automatically managed by the Session

      } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
        break;
      } catch (Exception e) {
        Log.e(TAG, "Render loop error", e);
        emitError("RENDER_ERROR", e.getMessage());
        break;
      }
    }

    // NAT-07: never leave a queued hit test unresolved when the loop ends.
    synchronized (hitTestLock) {
      isLoopRunning = false;
    }
    failPendingHitTests("Render loop stopped");

    Log.d(TAG, "Render loop ended");
  }

  /**
   * Update tracking state and emit events.
   *
   * Only emits when state actually changes.
   */
  private void updateTrackingState(TrackingState state) {
    if (state != lastTrackingState) {
      lastTrackingState = state;

      // ARCore 1.40.0: TrackingState enum has TRACKING, PAUSED, and NOT_TRACKING
      // NOT_TRACKING is available in ARCore 1.40.0
      String stateStr;
      if (state == TrackingState.TRACKING) {
        stateStr = "TRACKING";
      } else if (state == TrackingState.PAUSED) {
        stateStr = "PAUSED";
      } else {
        // Default to generic state description if NOT_TRACKING not recognized
        stateStr = state != null ? state.toString() : "UNKNOWN";
      }

      JSObject data = new JSObject();
      data.put("state", stateStr);

      if (eventEmitter != null) {
        eventEmitter.emit("trackingChanged", data);
      }

      Log.d(TAG, "Tracking state changed: " + stateStr);
    }
  }

  /**
   * Emit error event.
   */
  private void emitError(String code, String message) {
    if (eventEmitter != null) {
      JSObject data = new JSObject();
      data.put("code", code);
      data.put("message", message);
      eventEmitter.emit("error", data);
    }
    Log.e(TAG, "AR Error: " + code + " - " + message);
  }

  /**
   * Get the Filament Engine instance.
   * Public access for manager initialization.
   */
  public com.google.android.filament.Engine getFilamentEngine() {
    return filamentEngine;
  }

  /**
   * Get the Filament Scene instance.
   * Public access for manager initialization.
   */
  public com.google.android.filament.Scene getFilamentScene() {
    return filamentScene;
  }
}

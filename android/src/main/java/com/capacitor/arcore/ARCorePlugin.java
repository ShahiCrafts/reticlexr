package com.capacitor.arcore;

import android.Manifest;
import android.app.Activity;
import android.util.Log;
import android.webkit.WebView;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import com.capacitor.arcore.session.ARSessionManager;
import com.capacitor.arcore.view.ARViewManager;
import com.capacitor.arcore.render.ARRenderer;
import com.capacitor.arcore.surface.ARSurfaceManager;
import com.capacitor.arcore.interaction.ARCoordinateMapper;
import com.capacitor.arcore.events.AREventEmitter;
import com.capacitor.arcore.anchor.ARAnchorManager;
import com.capacitor.arcore.model.ARModelManager;

/**
 * ARCorePlugin
 *
 * Thin Capacitor facade for native AR functionality.
 *
 * Responsibilities:
 * - Receive Capacitor method calls
 * - Validate parameters
 * - Delegate to appropriate managers
 * - Convert results to Capacitor format
 * - Handle permissions
 *
 * Does NOT own:
 * - ARCore session lifecycle (ARSessionManager)
 * - View hierarchy (ARViewManager)
 * - Rendering (ARRenderer)
 * - Plane detection (ARSurfaceManager)
 * - Event emission (AREventEmitter)
 *
 * Thread model:
 * - Capacitor method calls: UI thread
 * - Delegates to managers which handle their own threading
 */
@CapacitorPlugin(
    name = "ARCore",
    permissions = {
        @Permission(
            alias = "camera",
            strings = { Manifest.permission.CAMERA }
        )
    }
)
public class ARCorePlugin extends Plugin {

  private static final String TAG = "ARCorePlugin";

  // Managers
  private ARSessionManager sessionManager;
  private ARViewManager viewManager;
  private ARRenderer renderer;
  private ARSurfaceManager surfaceManager;
  private ARCoordinateMapper coordinateMapper;
  private AREventEmitter eventEmitter;
  private ARAnchorManager anchorManager;
  private ARModelManager modelManager;

  private boolean isSessionActive = false;

  @Override
  public void load() {
    Log.d(TAG, "ARCore plugin loaded");

    // Initialize managers
    Activity activity = getActivity();

    eventEmitter = new AREventEmitter();
    sessionManager = new ARSessionManager(this.getContext());
    viewManager = new ARViewManager(activity);
    renderer = new ARRenderer(this.getContext());
    surfaceManager = new ARSurfaceManager();
    coordinateMapper = new ARCoordinateMapper();
    anchorManager = new ARAnchorManager();
    
    // Initialize model manager (needs renderer's Filament engine)
    // This will be set up after Filament is initialized

    // Wire up dependencies
    renderer.setSessionManager(sessionManager);
    renderer.setSurfaceManager(surfaceManager);
    renderer.setEventEmitter(eventEmitter);
    // NAT-07: the render loop serves plugin hit tests from its queue;
    // NAT-04: it creates real anchors from those hits.
    renderer.setCoordinateMapper(coordinateMapper);
    renderer.setAnchorManager(anchorManager);

    coordinateMapper.initialize(this.getContext());

    // Get WebView from Capacitor bridge
    WebView webView = getBridge().getWebView();
    viewManager.setCapacitorWebView(webView);

    // Register for native events
    setupEventBridge();

    Log.d(TAG, "ARCore plugin initialized");
  }

  /**
   * NAT-02: forward Activity pause to the AR session and the renderer.
   *
   * ARCore requires Session.pause() while the app is backgrounded;
   * without this hook the camera and the render loop kept running and
   * resume behaviour was undefined. The managers guard their own null
   * state, so forwarding is unconditional.
   */
  @Override
  protected void handleOnPause() {
    sessionManager.pauseSession();
    renderer.onActivityPaused();
  }

  /**
   * NAT-02: forward Activity resume to the AR session and the renderer.
   */
  @Override
  protected void handleOnResume() {
    sessionManager.resumeSession();
    renderer.onActivityResumed();
  }

  /**
   * LEAK-05: full teardown when the plugin is destroyed.
   *
   * Removes the AR view, clears models/anchors, then destroys the
   * renderer — which stops and joins the render loop and destroys all
   * Filament resources in dependency order — and closes the session.
   * Previously nothing was destroyed and the Filament engine leaked
   * for the process lifetime.
   */
  @Override
  protected void handleOnDestroy() {
    try {
      if (viewManager != null) {
        viewManager.removeARView();
      }
    } catch (Exception e) {
      Log.e(TAG, "Error removing AR view during destroy", e);
    }
    if (modelManager != null) {
      modelManager.clearAllModels();
    }
    if (anchorManager != null) {
      anchorManager.clearAllAnchors();
    }
    if (renderer != null) {
      renderer.destroy();
    }
    if (sessionManager != null) {
      sessionManager.closeSession();
    }
    isSessionActive = false;
    super.handleOnDestroy();
  }

  /**
   * Setup event forwarding from native to Capacitor.
   */
  private void setupEventBridge() {
    eventEmitter.addListener((type, data) -> {
      notifyListeners(type, data, true);
    });

    surfaceManager.addCallback(new ARSurfaceManager.SurfaceCallback() {
      @Override
      public void onSurfaceDetected(String planeType) {
        JSObject data = new JSObject();
        data.put("planeType", planeType);
        eventEmitter.emit("surfaceDetected", data);
      }

      @Override
      public void onSurfaceLost() {
        eventEmitter.emit("surfaceLost", new JSObject());
      }

      @Override
      public void onSurfaceUpdated(String planeType, int planeCount) {
        JSObject data = new JSObject();
        data.put("planeType", planeType);
        data.put("planeCount", planeCount);
        eventEmitter.emit("surfaceUpdated", data);
      }
    });
  }

  /**
   * Check if ARCore is supported.
   *
   * NAT-06: delegates to the same ArCoreApk availability check that
   * session creation uses — never a hardcoded answer. NAT-12: with
   * ARCore absent this resolves {supported:false} instead of throwing.
   */
  @PluginMethod
  public void checkSupport(PluginCall call) {
    JSObject result = new JSObject();
    try {
      com.google.ar.core.ArCoreApk.Availability availability =
          sessionManager.checkAvailability();
      switch (availability) {
        case SUPPORTED_INSTALLED:
          result.put("supported", true);
          result.put("reason", "ARCore supported");
          break;
        case SUPPORTED_NOT_INSTALLED:
          result.put("supported", false);
          result.put("reason", "ARCore is not installed on this device");
          break;
        case SUPPORTED_APK_TOO_OLD:
          result.put("supported", false);
          result.put("reason", "ARCore is too old; an update is required");
          break;
        case UNSUPPORTED_DEVICE_NOT_CAPABLE:
          result.put("supported", false);
          result.put("reason", "This device does not support ARCore");
          break;
        default:
          // UNKNOWN_ERROR / UNKNOWN_CHECKING / UNKNOWN_TIMED_OUT
          result.put("supported", false);
          result.put("reason", "ARCore availability could not be determined");
          break;
      }
    } catch (Exception e) {
      Log.e(TAG, "Availability check failed", e);
      result.put("supported", false);
      result.put("reason", "ARCore is not available on this device");
    }
    call.resolve(result);
  }

  /**
   * Start AR session.
   *
   * @param call contains options: planeDetection, lightEstimation
   */
  @PluginMethod
  public void startSession(PluginCall call) {
    // Check camera permission
    if (!hasRequiredPermissions()) {
      requestPermissionForAlias("camera", call, "handleCameraPermission");
      return;
    }

    try {
      boolean planeDetection = call.getBoolean("planeDetection", true);
      boolean lightEstimation = call.getBoolean("lightEstimation", true);

      // NAT-03: session creation needs the foreground Activity (the
      // ARCore install flow cannot run from the application Context).
      // A null Activity is a coded rejection, never an NPE/cast crash.
      Activity activity = getActivity();
      if (activity == null) {
        call.reject(
            "Cannot start AR session: no foreground Activity",
            "ACTIVITY_UNAVAILABLE");
        return;
      }

      // Create ARCore session
      sessionManager.createSession(
          activity,
          planeDetection,
          lightEstimation,
          new ARSessionManager.ARSessionCallback() {
            @Override
            public void onSessionReady() {
              // Session created, now setup views and renderer
              setupARRendering(call);
            }

            @Override
            public void onSessionError(String code, String message) {
              call.reject("Session error: " + code + " - " + message);
            }
          }
      );

    } catch (Exception e) {
      Log.e(TAG, "Error starting session", e);
      call.reject("Failed to start AR: " + e.getMessage());
    }
  }

  /**
   * Setup AR rendering after session created.
   */
  private void setupARRendering(PluginCall call) {
    // NAT-03: never dereference a null Activity.
    Activity activity = getActivity();
    if (activity == null) {
      call.reject(
          "Cannot set up AR rendering: no foreground Activity",
          "ACTIVITY_UNAVAILABLE");
      return;
    }
    activity.runOnUiThread(() -> {
      try {
        // NAT-10: Filament initializes lazily — fail this call cleanly
        // when the engine is unavailable instead of passing a null
        // engine into ARModelManager and crashing later.
        if (!renderer.ensureFilamentInitialized()
            || renderer.getFilamentEngine() == null
            || renderer.getFilamentScene() == null) {
          call.reject("Filament engine unavailable", "FILAMENT_UNAVAILABLE");
          return;
        }

        // Initialize model manager (needs Filament engine from renderer)
        if (modelManager == null) {
          modelManager = new ARModelManager(
              this.getContext(),
              renderer.getFilamentEngine(),
              renderer.getFilamentScene()
          );
        }

        // Signal renderer that session is ready
        renderer.onSessionReady();

        // Setup AR view (creates SurfaceView, attaches to hierarchy)
        viewManager.setupARView(
            renderer,
            new ARViewManager.ARViewCallback() {
              @Override
              public void onARViewReady() {
                isSessionActive = true;
                JSObject result = new JSObject();
                result.put("success", true);
                call.resolve(result);

                // Emit event
                eventEmitter.emit("sessionStarted", new JSObject());

                Log.d(TAG, "AR session started");
              }

              @Override
              public void onARViewError(String message) {
                call.reject("View setup failed: " + message);
              }
            }
        );

      } catch (Exception e) {
        Log.e(TAG, "Error setting up AR rendering", e);
        call.reject("Rendering setup failed: " + e.getMessage());
      }
    });
  }

  /**
   * Stop AR session.
   */
  @PluginMethod
  public void stopSession(PluginCall call) {
    // NAT-03: never dereference a null Activity. Teardown still happens
    // via handleOnDestroy if the Activity is already gone.
    Activity activity = getActivity();
    if (activity == null) {
      call.reject(
          "Cannot stop AR session: no foreground Activity",
          "ACTIVITY_UNAVAILABLE");
      return;
    }
    activity.runOnUiThread(() -> {
      try {
        // Cleanup models and anchors
        if (modelManager != null) {
          modelManager.clearAllModels();
        }
        if (anchorManager != null) {
          anchorManager.clearAllAnchors();
        }

        // Signal renderer session closed
        renderer.onSessionClosed();

        // Remove AR views and restore WebView
        viewManager.removeARView();

        // Close session
        sessionManager.closeSession();

        isSessionActive = false;

        eventEmitter.emit("sessionStopped", new JSObject());

        call.resolve();

        Log.d(TAG, "AR session stopped");

      } catch (Exception e) {
        Log.e(TAG, "Error stopping session", e);
        call.reject("Failed to stop AR: " + e.getMessage());
      }
    });
  }

  /**
   * Perform hit test at normalized screen coordinates.
   *
   * NAT-07: the hit test is queued to the render loop, which serves it
   * against the frame it just acquired (Session.update() runs only on
   * the render thread; a Frame is never handed to the bridge thread).
   * The call is resolved from the render thread when the queue drains.
   * NAT-04: a successful hit creates a real ARCore Anchor (on the
   * render thread) and returns its registered anchorId.
   *
   * @param call contains: x (float 0-1), y (float 0-1)
   */
  @PluginMethod
  public void hitTest(PluginCall call) {
    if (!isSessionActive) {
      JSObject result = new JSObject();
      result.put("hit", false);
      result.put("error", "Session not active");
      call.resolve(result);
      return;
    }

    float x = call.getFloat("x", 0.5f);
    float y = call.getFloat("y", 0.5f);

    boolean submitted = renderer.submitHitTest(x, y, (hit, anchorId, error) -> {
      JSObject result = new JSObject();
      if (error != null) {
        result.put("hit", false);
        result.put("error", error);
      } else if (hit != null) {
        result.put("hit", true);
        result.put("position", floatArrayToJSArray(hit.position));
        result.put("rotation", floatArrayToJSArray(hit.rotation));
        result.put("planeType", hit.planeType);
        if (anchorId != null) {
          result.put("anchorId", anchorId);
        }
      } else {
        result.put("hit", false);
      }
      call.resolve(result);
    });

    if (!submitted) {
      // Render loop is not running (e.g. Activity paused): resolve
      // immediately rather than queueing into a stopped loop.
      JSObject result = new JSObject();
      result.put("hit", false);
      result.put("error", "Render loop not running");
      call.resolve(result);
    }
  }

  /**
   * Handle camera permission callback.
   */
  @PermissionCallback
  private void handleCameraPermission(PluginCall call) {
    if (getPermissionState("camera").equals("granted")) {
      startSession(call);
    } else {
      call.reject("Camera permission is required for AR");
    }
  }

  /**
   * Place a GLB model at a hit test result.
   *
   * NAT-01 (Option B): native model rendering is NOT implemented. The
   * Android runtime is scoped to session + hit-testing; the previous
   * implementation registered model metadata and resolved success for a
   * model that was never rendered. This method now rejects honestly
   * with a coded NOT_IMPLEMENTED. Model rendering is provided by the
   * WebXR runtime.
   *
   * @param call contains: modelPath (path to GLB), hitId (from previous hitTest)
   */
  @PluginMethod
  public void placeModel(PluginCall call) {
    call.reject(
        "placeModel is not implemented in the native Android runtime: "
            + "native is scoped to session + hit-testing (Option B); "
            + "model rendering is provided by the WebXR runtime",
        "NOT_IMPLEMENTED");
  }

  /**
   * Update model transform (position, rotation, scale).
   *
   * NOT implemented natively (Option B; owner decision recorded after
   * Phase 5): this previously applied the transform to the
   * ARModelManager metadata registry and resolved success — but since
   * placeModel rejects (NAT-01), no model can ever exist in that
   * registry, and nothing was ever rendered. Like placeModel /
   * moveModel it now rejects honestly with a coded NOT_IMPLEMENTED.
   * ARModelManager is kept: Option A (real native rendering) would
   * reuse it.
   *
   * @param call contains: modelId, rotation (array [x, y, z] in degrees), scale
   */
  @PluginMethod
  public void setTransform(PluginCall call) {
    call.reject(
        "setTransform is not implemented in the native Android runtime: "
            + "native is scoped to session + hit-testing (Option B) and places no models",
        "NOT_IMPLEMENTED");
  }

  /**
   * Set model material/color.
   *
   * NOT implemented natively (Option B; owner decision recorded after
   * Phase 5): this previously set a colour on the ARModelManager
   * metadata registry and resolved success — but since placeModel
   * rejects (NAT-01), no model can ever exist in that registry, and
   * nothing was ever rendered. Like placeModel / moveModel it now
   * rejects honestly with a coded NOT_IMPLEMENTED. ARModelManager is
   * kept: Option A (real native rendering) would reuse it.
   *
   * @param call contains: modelId, color (hex string like "#7D8B67")
   */
  @PluginMethod
  public void setMaterial(PluginCall call) {
    call.reject(
        "setMaterial is not implemented in the native Android runtime: "
            + "native is scoped to session + hit-testing (Option B) and places no models",
        "NOT_IMPLEMENTED");
  }

  /**
   * Move model to new screen position (hit test and reposition).
   *
   * NAT-05 (Option B): NOT implemented natively — the previous
   * implementation hit-tested, resolved {success:true} and emitted
   * modelMoved without moving anything. Since native places no models
   * (NAT-01), there is nothing to move; this rejects NOT_IMPLEMENTED
   * instead of reporting a fictional success.
   *
   * @param call contains: modelId, x, y (normalized screen coords)
   */
  @PluginMethod
  public void moveModel(PluginCall call) {
    call.reject(
        "moveModel is not implemented in the native Android runtime: "
            + "native is scoped to session + hit-testing (Option B) and places no models",
        "NOT_IMPLEMENTED");
  }

  /**
   * Remove a model.
   *
   * NOT implemented natively (Option B; owner decision recorded after
   * Phase 5): this previously removed the model from the
   * ARModelManager metadata registry and resolved success — but since
   * placeModel rejects (NAT-01), no model can ever exist in that
   * registry, and nothing was ever rendered. Like placeModel /
   * moveModel it now rejects honestly with a coded NOT_IMPLEMENTED.
   * ARModelManager is kept: Option A (real native rendering) would
   * reuse it.
   *
   * @param call contains: modelId
   */
  @PluginMethod
  public void removeModel(PluginCall call) {
    call.reject(
        "removeModel is not implemented in the native Android runtime: "
            + "native is scoped to session + hit-testing (Option B) and places no models",
        "NOT_IMPLEMENTED");
  }

  /**
   * Enumerate placed models.
   *
   * The facade gained this method in Phase 4 (API-03). NAT-01
   * (Option B): the native runtime renders and places no models, so
   * there is nothing to enumerate — this rejects with a coded
   * NOT_IMPLEMENTED rather than returning a fictional list.
   */
  @PluginMethod
  public void getPlacedModels(PluginCall call) {
    call.reject(
        "getPlacedModels is not implemented in the native Android runtime: "
            + "native is scoped to session + hit-testing (Option B) and places no models",
        "NOT_IMPLEMENTED");
  }

  /**
   * Clear all placed models.
   *
   * See getPlacedModels — NAT-01 (Option B): no native models exist to
   * clear, so this rejects with a coded NOT_IMPLEMENTED.
   */
  @PluginMethod
  public void clearModels(PluginCall call) {
    call.reject(
        "clearModels is not implemented in the native Android runtime: "
            + "native is scoped to session + hit-testing (Option B) and places no models",
        "NOT_IMPLEMENTED");
  }

  /**
   * Convert float array to Capacitor JSArray.
   */
  private com.getcapacitor.JSArray floatArrayToJSArray(float[] array) {
    com.getcapacitor.JSArray jsArray = new com.getcapacitor.JSArray();
    try {
      for (float value : array) {
        jsArray.put(value);
      }
    } catch (org.json.JSONException e) {
      Log.e(TAG, "Error converting float array to JSArray", e);
    }
    return jsArray;
  }
}

'use client';

// Live demo ported from example/src/components/ARPlayground.jsx.
// The library is plain ESM; it is loaded dynamically on the client only
// (WebXR needs a browser, and the package entry runs an event-bridge
// setup at import time). The source is synced from ../src into
// website/sdk-src by scripts/sync-sdk.mjs — see website/README.md.

import React, { useEffect, useRef, useState } from 'react';
import {
  LuBird,
  LuCamera,
  LuCircleHelp,
  LuFootprints,
  LuRocket,
  LuScaling,
  LuTrash2,
  LuX,
} from 'react-icons/lu';

// Sketchfab models supplied by the site owner (credits and
// licences on the demo page below the player). The astronaut and
// the rhino carry animation clips, which the library now plays.
const MODELS = [
  { id: 'astronaut', label: 'Astronaut', url: '/models/astronaut.glb', Icon: LuRocket },
  { id: 'duck', label: 'Duck', url: '/models/duck.glb', Icon: LuBird },
  { id: 'rhino', label: 'Rhino', url: '/models/rhino.glb', Icon: LuFootprints },
];
const SWATCHES = [
  ['Beige', '#c8b49b'],
  ['Grey', '#858585'],
  ['Olive', '#68705b'],
  ['Navy', '#222b3c'],
  ['Terracotta', '#a55f3b'],
];

export default function DemoClient() {
  const overlayRef = useRef(null);
  const viewRef = useRef(null);
  const modelIndexRef = useRef(0);
  // Gesture callbacks fire at pointer-event rate; pushing each one
  // through React state re-rendered the whole demo dozens of times a
  // second on a mid-range phone and the frame drops read as gesture
  // glitch. Latest values are queued here and flushed once per frame.
  const readoutRef = useRef({ raf: 0, scale: null, rotation: null });
  const queueReadout = (patch) => {
    Object.assign(readoutRef.current, patch);
    if (readoutRef.current.raf) return;
    readoutRef.current.raf = requestAnimationFrame(() => {
      readoutRef.current.raf = 0;
      if (readoutRef.current.scale !== null) setScale(readoutRef.current.scale);
      if (readoutRef.current.rotation !== null) setRotation(readoutRef.current.rotation);
    });
  };
  const [supported, setSupported] = useState(null);
  const [supportReason, setSupportReason] = useState('');
  const [active, setActive] = useState(false);
  const [surface, setSurface] = useState(false);
  const [modelIndex, setModelIndex] = useState(0);
  const [placed, setPlaced] = useState(false);
  const [busy, setBusy] = useState(false);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [color, setColor] = useState(SWATCHES[0][1]);
  const [toast, setToast] = useState('');
  const [shot, setShot] = useState(null);
  const [needsResume, setNeedsResume] = useState(false);
  const [loadError, setLoadError] = useState('');
  const secure = typeof window !== 'undefined' ? window.isSecureContext : false;

  useEffect(() => {
    modelIndexRef.current = modelIndex;
  }, [modelIndex]);

  useEffect(() => {
    let view = null;
    let cancelled = false;
    (async () => {
      try {
        const sdk = await import('../sdk-src/index.js');
        if (cancelled) return;
        view = sdk.createARView({ overlay: overlayRef.current });
        viewRef.current = view;
        const r = await view.checkSupport();
        if (!cancelled) {
          setSupported(r.supported);
          if (!r.supported) setSupportReason(r.reason || '');
        }
      } catch (e) {
        if (!cancelled) setLoadError(e?.message || 'Failed to load the AR library.');
      }
    })();
    return () => {
      cancelled = true;
      cancelAnimationFrame(readoutRef.current.raf);
      if (viewRef.current === view && view) view.destroy().catch(() => {});
    };
  }, []);

  const start = async () => {
    const v = viewRef.current;
    if (!v) return;
    setBusy(true);
    try {
      await v.create({
        overlay: overlayRef.current,
        showReticle: true,
        showPlaneDots: true,
        dotSpacing: 0.14,
        lightEstimation: true,
        // The demo has a screenshot button, so camera access is
        // requested up front: WebXR grants session features only at
        // requestSession — there is no way to ask later, mid-session.
        enableScreenshots: true,
        // Render the XR layer at 85% scale: fragment work drops by
        // ~28% (it scales with the square), which is the difference
        // between holding and missing 60 fps on mid-range phones.
        // The camera feed stays full resolution.
        framebufferScale: 0.85,
      });
      v.onFrame((e) => {
        if (e.type === 'surfaceDetected') setSurface(true);
        if (e.type === 'surfaceLost') setSurface(false);
        if (e.type === 'sessionEnded') {
          setSurface(false);
          setNeedsResume(true);
        }
      });
      // The models total ~12 MB: preload only the selected one so
      // the AR view opens promptly, then warm the cache with the
      // rest in the background (they load on first use regardless).
      await v.preloadModels([MODELS[modelIndexRef.current].url]);
      v.enableCustomization({
        modelUrl: () => MODELS[modelIndexRef.current].url,
        onTap: () =>
          setTimeout(() => {
            if (v.activeModelId) {
              setPlaced(true);
              setToast('Drag to move • pinch to scale • twist to rotate');
            }
          }, 0),
        onScale: (s) => queueReadout({ scale: s }),
        onRotate: (r) => queueReadout({ rotation: r }),
        onError: (e) =>
          setToast(
            /surface/i.test(e?.message || '')
              ? 'No surface there. Aim at the dots and tap'
              : e?.message || 'Something went wrong',
          ),
      });
      setActive(true);
      setToast('Move slowly. Dots show detected surfaces');
      v.preloadModels(MODELS.map((m) => m.url)).catch(() => {});
    } catch (e) {
      setToast(e.message);
    }
    setBusy(false);
  };

  const chooseModel = async (i) => {
    setModelIndex(i);
    modelIndexRef.current = i;
    if (viewRef.current?.activeModelId) {
      setBusy(true);
      // The demo's models are unrelated products, not variants of one
      // product: switch WITHOUT material preservation, or the outgoing
      // model's colour and texture would be carried onto the new one
      // (the rhino's hide on the duck). The swatch selection resets to
      // match: the new model shows its own authored look.
      await viewRef.current.switchModel(MODELS[i].url, { preserveMaterial: false });
      setColor(SWATCHES[0][1]);
      setPlaced(true);
      setBusy(false);
      setToast(`${MODELS[i].label} switched in place`);
    } else {
      setToast('Tap the dotted surface to place');
    }
  };

  const chooseColor = async (c) => {
    setColor(c);
    await viewRef.current?.setColor(c);
  };

  const reset = async () => {
    await viewRef.current?.removeModel();
    setPlaced(false);
    setScale(1);
    setRotation(0);
    setToast('Tap the dotted surface to place');
  };

  const screenshot = async () => {
    setBusy(true);
    const r = await viewRef.current.takeScreenshot({ format: 'png', includeReticle: false });
    setBusy(false);
    if (!r.success) {
      setToast(r.error || 'Screenshot unavailable in this browser.');
      return;
    }
    setShot(r.dataUrl);
    setToast('Screenshot captured');
  };

  const saveShot = () => {
    if (!shot) return;
    const a = document.createElement('a');
    a.href = shot;
    a.download = `ar-${Date.now()}.png`;
    a.click();
  };

  const resume = async () => {
    setNeedsResume(false);
    await start();
  };

  const close = async () => {
    await viewRef.current?.destroy();
    setActive(false);
    setPlaced(false);
    setSurface(false);
  };

  const unsupported = !secure || supported === false;

  return (
    <div
      ref={overlayRef}
      className="ar-demo-canvas-container relative flex min-h-[560px] w-full flex-col overflow-hidden rounded-2xl bg-slate-950 text-white"
    >
      {!active ? (
        <main className="flex flex-1 flex-col items-center justify-center px-6 py-14 text-center">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-lg font-bold" aria-hidden="true">
            AR
          </div>
          <p className="font-mono text-xs font-medium uppercase tracking-widest text-blue-300">Live WebXR demo</p>
          <h2 className="mt-3 text-3xl font-bold leading-tight">
            See it in
            <br />
            your space.
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-300">
            Scan a surface, tap to place, pinch to resize and twist to rotate. This demo runs the
            actual <code className="font-mono text-[0.85em]">reticlexr</code> library in your
            browser.
          </p>

          {loadError ? (
            <div className="mt-6 max-w-md rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200" role="alert">
              <strong className="font-semibold">The AR library failed to load.</strong>
              <br />
              {loadError}
            </div>
          ) : unsupported ? (
            <div className="mt-6 max-w-md rounded-lg border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100" role="alert">
              <strong className="font-semibold">AR isn&rsquo;t available here.</strong>
              <br />
              {!secure
                ? 'WebXR needs a secure context. Open this page over HTTPS (or localhost) and try again.'
                : supportReason ||
                  'This browser does not support immersive WebXR AR. Use Chrome on an ARCore-capable Android phone.'}
            </div>
          ) : null}

          <button
            type="button"
            className="mt-7 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300"
            disabled={unsupported || busy || supported === null}
            onClick={start}
          >
            {busy ? 'Opening camera…' : supported === null ? 'Checking support…' : 'View in your room'}
          </button>
          <small className="mt-3 text-xs text-slate-400">
            {!secure
              ? 'Trusted HTTPS is required.'
              : supported === false
                ? 'Immersive WebXR AR is not supported in this browser.'
                : 'Android Chrome • ARCore-compatible device • HTTPS'}
          </small>
        </main>
      ) : (
        <>
          {/* The in-AR header sits over the camera feed, where the
              phone's status bar / camera cutout also lives — drop it
              below that zone (safe-area inset when the device
              reports one, a fixed extra drop otherwise). */}
          <header
            className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-4"
            style={{ paddingTop: 'max(1.75rem, calc(1rem + env(safe-area-inset-top, 0px)))' }}
            data-ui="true"
          >
            <button type="button" onClick={close} aria-label="Close AR" className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 focus-visible:outline-2 focus-visible:outline-blue-300">
              <LuX size={20} aria-hidden="true" />
            </button>
            <div className="rounded-full bg-black/50 px-3 py-1.5 text-sm font-medium">AR View</div>
            <button
              type="button"
              aria-label="Gesture help"
              onClick={() => setToast('Dots = detected surface • tap = place • pinch = scale • twist = rotate')}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 focus-visible:outline-2 focus-visible:outline-blue-300"
            >
              <LuCircleHelp size={20} aria-hidden="true" />
            </button>
          </header>

          <div
            className="pointer-events-none absolute inset-x-0 z-10 flex justify-center"
            style={{ top: 'calc(5rem + max(0.75rem, env(safe-area-inset-top, 0px)))' }}
          >
            <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${surface ? 'bg-emerald-500/80' : 'bg-black/50'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${surface ? 'bg-white' : 'bg-slate-300'}`} aria-hidden="true" />
              {surface ? 'Surface ready' : 'Scanning your space…'}
            </span>
          </div>
          {toast && (
            <div
              className="pointer-events-none absolute inset-x-0 z-10 flex justify-center px-4"
              style={{ top: 'calc(8rem + max(0.75rem, env(safe-area-inset-top, 0px)))' }}
            >
              <span className="rounded-full bg-black/60 px-3 py-1.5 text-center text-xs">{toast}</span>
            </div>
          )}

          <div className="flex-1" />

          {placed && (
            <div className="absolute right-4 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-2" data-ui="true">
              <button type="button" onClick={screenshot} aria-label="Take screenshot" className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 focus-visible:outline-2 focus-visible:outline-blue-300"><LuCamera size={20} aria-hidden="true" /></button>
              <button type="button" onClick={() => setToast(`${scale.toFixed(2)}× scale`)} aria-label="Show scale" className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 focus-visible:outline-2 focus-visible:outline-blue-300"><LuScaling size={20} aria-hidden="true" /></button>
              <button type="button" onClick={reset} aria-label="Remove model" className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 focus-visible:outline-2 focus-visible:outline-blue-300"><LuTrash2 size={20} aria-hidden="true" /></button>
            </div>
          )}

          <div className="relative z-10 space-y-3 p-4" data-ui="true">
            <div className="flex justify-center gap-2">
              {MODELS.map((m, i) => (
                <button
                  key={m.id}
                  type="button"
                  disabled={busy}
                  onClick={() => chooseModel(i)}
                  className={`flex flex-col items-center rounded-xl px-4 py-2 text-xs font-medium focus-visible:outline-2 focus-visible:outline-blue-300 ${
                    i === modelIndex ? 'bg-blue-600 text-white' : 'bg-black/50 text-slate-200'
                  }`}
                >
                  <m.Icon size={22} aria-hidden="true" />
                  {m.label}
                </button>
              ))}
            </div>

            {placed && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="text-xs text-slate-300">Colour:</span>
                {SWATCHES.map(([name, c]) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => chooseColor(c)}
                    aria-label={`Set colour ${name}`}
                    className={`h-8 w-8 rounded-full border-2 focus-visible:outline-2 focus-visible:outline-blue-300 ${color === c ? 'border-white' : 'border-white/30'}`}
                    style={{ background: c }}
                  />
                ))}
                <span className="text-xs text-slate-300">
                  Pinch {scale.toFixed(2)}× · Twist {Math.round((rotation * 180) / Math.PI)}°
                </span>
              </div>
            )}

            {/* No dedicated place button: placement is a tap on a
                detected surface (the gesture controller places the
                selected model at the tap point). This pill only
                explains the current state. */}
            <div className="flex justify-center">
              {placed ? (
                <div className="rounded-full bg-black/50 px-4 py-2 text-xs">Model placed. Tap a product above to switch it in place</div>
              ) : (
                <div className="rounded-full bg-black/50 px-4 py-2 text-xs">
                  {surface
                    ? `Tap a dotted surface to place the ${MODELS[modelIndex].label.toLowerCase()}`
                    : 'Aim at a flat surface until dots appear, then tap to place'}
                </div>
              )}
            </div>
          </div>

          {shot && (
            <div className="absolute inset-0 z-20 flex flex-col bg-slate-950" data-ui="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={shot} alt="AR screenshot" className="min-h-0 flex-1 object-contain" />
              <div className="flex justify-center gap-3 p-4">
                <button type="button" onClick={() => setShot(null)} className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-blue-300">Back to AR</button>
                <button type="button" onClick={saveShot} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-blue-300">Save photo</button>
              </div>
            </div>
          )}

          {needsResume && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/80 p-6" data-ui="true">
              <div className="max-w-xs rounded-2xl bg-slate-900 p-5 text-center">
                <b className="text-base">AR paused</b>
                <p className="mt-2 text-sm text-slate-300">The immersive session ended while another app was open.</p>
                <button type="button" onClick={resume} className="mt-4 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-blue-300">Resume AR</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

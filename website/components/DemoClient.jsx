'use client';

// Live demo ported from example/src/components/ARPlayground.jsx.
// The library is plain ESM; it is loaded dynamically on the client only
// (WebXR needs a browser, and the package entry runs an event-bridge
// setup at import time). The source is synced from ../src into
// website/sdk-src by scripts/sync-sdk.mjs — see website/README.md.

import React, { useEffect, useRef, useState } from 'react';

const MODELS = [
  { id: 'sofa', label: 'Sofa', url: '/models/sofa.glb', emoji: '🛋️' },
  { id: 'chair', label: 'Chair', url: '/models/chair.glb', emoji: '🪑' },
  { id: 'table', label: 'Table', url: '/models/table.glb', emoji: '▰' },
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
      });
      v.onFrame((e) => {
        if (e.type === 'surfaceDetected') setSurface(true);
        if (e.type === 'surfaceLost') setSurface(false);
        if (e.type === 'sessionEnded') {
          setSurface(false);
          setNeedsResume(true);
        }
      });
      await v.preloadModels(MODELS.map((m) => m.url));
      v.enableCustomization({
        modelUrl: () => MODELS[modelIndexRef.current].url,
        onTap: () => setTimeout(() => setPlaced(!!v.activeModelId), 0),
        onScale: (s) => setScale(s),
        onRotate: (r) => setRotation(r),
      });
      setActive(true);
      setToast('Move slowly — dots show detected surfaces');
    } catch (e) {
      setToast(e.message);
    }
    setBusy(false);
  };

  const place = async () => {
    if (!surface || busy) return;
    setBusy(true);
    const r = await viewRef.current.placeModel(MODELS[modelIndex].url);
    if (r.success) {
      setPlaced(true);
      setToast('Pinch to scale • twist to rotate');
    } else {
      setToast('No surface found yet — keep scanning.');
    }
    setBusy(false);
  };

  const chooseModel = async (i) => {
    setModelIndex(i);
    modelIndexRef.current = i;
    if (viewRef.current?.activeModelId) {
      setBusy(true);
      await viewRef.current.switchModel(MODELS[i].url);
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
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-300">Furniture preview</p>
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
          <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-4" data-ui="true">
            <button type="button" onClick={close} aria-label="Close AR" className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-xl focus-visible:outline-2 focus-visible:outline-blue-300">
              ×
            </button>
            <div className="rounded-full bg-black/50 px-3 py-1.5 text-sm font-medium">AR View</div>
            <button
              type="button"
              aria-label="Gesture help"
              onClick={() => setToast('Dots = detected surface • tap = place • pinch = scale • twist = rotate')}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 focus-visible:outline-2 focus-visible:outline-blue-300"
            >
              ?
            </button>
          </header>

          <div className="pointer-events-none absolute inset-x-0 top-20 z-10 flex justify-center">
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${surface ? 'bg-emerald-500/80' : 'bg-black/50'}`}>
              {surface ? '● Surface ready' : '○ Scanning your space…'}
            </span>
          </div>
          {toast && (
            <div className="pointer-events-none absolute inset-x-0 top-32 z-10 flex justify-center px-4">
              <span className="rounded-full bg-black/60 px-3 py-1.5 text-center text-xs">{toast}</span>
            </div>
          )}

          <div className="flex-1" />

          {placed && (
            <div className="absolute right-4 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-2" data-ui="true">
              <button type="button" onClick={screenshot} aria-label="Take screenshot" className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 focus-visible:outline-2 focus-visible:outline-blue-300">▧</button>
              <button type="button" onClick={() => setToast(`${scale.toFixed(2)}× scale`)} aria-label="Show scale" className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-xs focus-visible:outline-2 focus-visible:outline-blue-300">1:1</button>
              <button type="button" onClick={reset} aria-label="Remove model" className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 focus-visible:outline-2 focus-visible:outline-blue-300">↶</button>
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
                  <span className="text-lg" aria-hidden="true">{m.emoji}</span>
                  {m.label}
                </button>
              ))}
            </div>

            {placed && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="text-xs text-slate-300">Fabric:</span>
                {SWATCHES.map(([name, c]) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => chooseColor(c)}
                    aria-label={`Set color ${name}`}
                    className={`h-8 w-8 rounded-full border-2 focus-visible:outline-2 focus-visible:outline-blue-300 ${color === c ? 'border-white' : 'border-white/30'}`}
                    style={{ background: c }}
                  />
                ))}
                <span className="text-xs text-slate-300">
                  Pinch {scale.toFixed(2)}× · Twist {Math.round((rotation * 180) / Math.PI)}°
                </span>
              </div>
            )}

            <div className="flex justify-center">
              {!placed ? (
                <button
                  type="button"
                  disabled={!surface || busy}
                  onClick={place}
                  className={`h-16 w-16 rounded-full border-4 focus-visible:outline-2 focus-visible:outline-blue-300 ${
                    surface ? 'border-white bg-blue-600' : 'border-white/40 bg-white/20'
                  }`}
                  aria-label="Place model"
                />
              ) : (
                <div className="rounded-full bg-black/50 px-4 py-2 text-xs">Model placed — tap a product above to switch it in place</div>
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

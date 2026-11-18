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

// Flight recorder: when an AR session ends unexpectedly on a
// phone there is no console to read, so the demo keeps a small
// ring of events (engine trace, page errors, gesture markers) in
// local storage. It survives the session, and the close report
// built from it is shown on the next launch, ready to copy.
const REC_KEY = 'reticlexr-flight-recorder';
const CRASH_KEY = 'reticlexr-last-close';

function recPush(kind, msg) {
  try {
    const arr = JSON.parse(localStorage.getItem(REC_KEY) || '[]');
    arr.push({ t: new Date().toISOString(), kind, msg: String(msg ?? '').slice(0, 400) });
    while (arr.length > 120) arr.shift();
    localStorage.setItem(REC_KEY, JSON.stringify(arr));
  } catch (_) {
    /* storage unavailable: the recorder is best-effort */
  }
}

function recRead() {
  try {
    return JSON.parse(localStorage.getItem(REC_KEY) || '[]');
  } catch (_) {
    return [];
  }
}

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
  const surfaceBankRef = useRef({ banked: 0, since: null });
  const [crashReport, setCrashReport] = useState(null);
  const recorderRef = useRef({ interval: null, startedAt: 0, userClose: false, framesStopped: false });
  const [modelIndex, setModelIndex] = useState(0);
  const [placed, setPlaced] = useState(false);
  const [busy, setBusy] = useState(false);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [color, setColor] = useState(SWATCHES[0][1]);
  const [toast, setToast] = useState('');
  const [debugEntries, setDebugEntries] = useState([]);
  const [projNorm, setProjNorm] = useState(null);
  const [sysInfo, setSysInfo] = useState({ space: '—', lock: '—', fps: '—' });
  const [debugVisible, setDebugVisible] = useState(true);
  const dbgLastOf = (types) => {
    for (let i = debugEntries.length - 1; i >= 0; i--) {
      if (types.includes(debugEntries[i].type)) return debugEntries[i];
    }
    return null;
  };
  const dbgFmt = (v) => {
    if (!v) return '—';
    const a = Array.isArray(v) ? v : [v.x, v.y, v.z];
    return `(${a.map((n) => Number(n).toFixed(3)).join(', ')})`;
  };
  const dbgTap = dbgLastOf(['tap', 'dragend']);
  const dbgPlace = dbgLastOf(['placed', 'moved']);
  const dbgBase = dbgLastOf(['placed', 'switched']);
  const dbgDeltaMm = (() => {
    if (!dbgPlace?.hit || !dbgPlace?.centre) return null;
    const h = Array.isArray(dbgPlace.hit) ? dbgPlace.hit : [dbgPlace.hit.x, dbgPlace.hit.y, dbgPlace.hit.z];
    const c = [dbgPlace.centre.x, dbgPlace.centre.y, dbgPlace.centre.z];
    return Math.hypot(h[0] - c[0], h[1] - c[1], h[2] - c[2]) * 1000;
  })();
  const [shot, setShot] = useState(null);
  const [needsResume, setNeedsResume] = useState(false);
  const [loadError, setLoadError] = useState('');
  const secure = typeof window !== 'undefined' ? window.isSecureContext : false;

  useEffect(() => {
    modelIndexRef.current = modelIndex;
  }, [modelIndex]);

  // Flight recorder: surface a stored close report from a
  // previous visit, and capture page-level errors into the ring
  // (a session that dies from an exception leaves its last words
  // here).
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CRASH_KEY);
      if (stored) setCrashReport(JSON.parse(stored));
    } catch (_) {
      /* ignore */
    }
    const onError = (e) => recPush('page-error', e.message || 'unknown error');
    const onRejection = (e) =>
      recPush('unhandled-rejection', e.reason?.message || String(e.reason || 'unknown'));
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

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
    surfaceBankRef.current = { banked: 0, since: null };
    setBusy(true);
    try {
      await v.create({
        overlay: overlayRef.current,
        showReticle: false,
        // No dot grid on the ground: plane detection keeps running
        // in the background (the centre hit test drives surface
        // state and auto-placement); only the dots are not drawn.
        showPlaneDots: false,
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
        // Track how long a surface has been held in total: the
        // placement gate below waits for a short bank of stable
        // surface time before enabling taps — Scene Viewer's
        // scan discipline (never place on an immature map).
        const bank = surfaceBankRef.current;
        if (e.type === 'surfaceDetected') {
          setSurface(true);
          if (bank.since == null) bank.since = performance.now();
        }
        if (e.type === 'surfaceLost') {
          setSurface(false);
          if (bank.since != null) {
            bank.banked += performance.now() - bank.since;
            bank.since = null;
          }
        }
        if (e.type === 'sessionEnded') {
          // Flight recorder: close out the session. A close the
          // user did not ask for becomes a report they can copy
          // and send; it is also stored for the next launch.
          const rec = recorderRef.current;
          if (rec.interval) {
            clearInterval(rec.interval);
            rec.interval = null;
          }
          try {
            const eng = viewRef.current?.engine;
            if (eng) {
              eng.drainTrace().forEach((entry) => {
                const { t, kind, ...rest } = entry;
                recPush(kind, JSON.stringify(rest));
              });
              if (!rec.userClose && rec.startedAt) {
                const report = {
                  endedAt: new Date().toISOString(),
                  seconds: Math.round((performance.now() - rec.startedAt) / 1000),
                  diag: eng.getDiagnostics(),
                  recent: recRead().slice(-18),
                };
                localStorage.setItem(CRASH_KEY, JSON.stringify(report));
                setCrashReport(report);
              }
            }
          } catch (_) {
            /* the recorder must never break session teardown */
          }
          rec.startedAt = 0;
          rec.userClose = false;
          rec.framesStopped = false;
          setSurface(false);
          bank.banked = 0;
          bank.since = null;
          setNeedsResume(true);
        }
      });
      // The models total ~12 MB: preload only the selected one so
      // the AR view opens promptly, then warm the cache with the
      // rest in the background (they load on first use regardless).
      await v.preloadModels([MODELS[modelIndexRef.current].url]);
      // Placement maturity gate: hold gesture placement until
      // the tracker has held a surface for a short bank of time
      // (800 ms), so the first model never lands on an immature
      // map — a leading cause of early drift, and the reason
      // Scene Viewer makes you scan before it lets you place.
      // Capped at 6 s so a difficult room can never trap anyone.
      {
        const bank = surfaceBankRef.current;
        const gateStart = performance.now();
        const bankedMs = () =>
          bank.banked + (bank.since != null ? performance.now() - bank.since : 0);
        while (bankedMs() < 800 && performance.now() - gateStart < 6000) {
          await new Promise((r) => setTimeout(r, 100));
        }
      }
      v.enableCustomization({
        modelUrl: () => MODELS[modelIndexRef.current].url,
        debug: true,
        // Keep a deep window: at 8 entries, a few seconds of drag
        // events evicted the last 'placed' entry and the panel's
        // model/base-centre lines went blank mid-session. 'proj'
        // entries (where the model's centre falls on screen) arrive
        // several times a second, so they bypass the window and go
        // straight to their own state.
        onDebug: (entry) => {
          // Live system line for the debug panel: which reference
          // space the session got, whether the active model is
          // riding a real XRAnchor or plain coordinates, and the
          // render rate. This is what decides world-lock quality,
          // so it stays visible while testing on device.
          const eng = v.engine;
          if (eng) {
            const rec = v.activeModelId ? eng.anchors?.get(v.activeModelId) : null;
            setSysInfo({
              space: eng.referenceSpaceType || '—',
              lock: rec ? (rec.xrAnchor ? 'anchored' : 'coordinates') : '—',
              fps: eng.fpsEstimate ? String(Math.round(eng.fpsEstimate)) : '—',
            });
          }
          if (entry.type === 'proj') {
            setProjNorm(entry.normalised);
            return;
          }
          setDebugEntries((prev) => [...prev.slice(-39), entry]);
        },
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
      // Flight recorder: from here the session is live. Drain the
      // engine trace into storage once a second, and run a
      // watchdog: if frames stop advancing while the session is
      // supposedly active, that is a distinct failure from a
      // session end and gets its own marker.
      {
        const rec = recorderRef.current;
        rec.startedAt = performance.now();
        rec.userClose = false;
        rec.framesStopped = false;
        recPush('session-open', 'demo session started');
        if (rec.interval) clearInterval(rec.interval);
        rec.interval = setInterval(() => {
          try {
            const eng = viewRef.current?.engine;
            if (!eng) return;
            eng.drainTrace().forEach((entry) => {
              const { t, kind, ...rest } = entry;
              recPush(kind, JSON.stringify(rest));
            });
            const diag = eng.getDiagnostics();
            if (
              diag.sessionActive &&
              diag.lastFrameAgoMs != null &&
              diag.lastFrameAgoMs > 2500 &&
              !rec.framesStopped
            ) {
              rec.framesStopped = true;
              recPush('frames-stopped', JSON.stringify(diag));
            }
          } catch (_) {
            /* watchdog is best-effort */
          }
        }, 1000);
      }
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
    recorderRef.current.userClose = true;
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

          {crashReport ? (
            <div className="mt-6 w-full max-w-md rounded-lg border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-left text-sm text-rose-100" role="alert">
              <strong className="font-semibold">The last AR session ended on its own.</strong>
              <p className="mt-1 text-rose-200/90">
                After {crashReport.seconds}s · {crashReport.diag?.frames ?? '?'} frames ·{' '}
                {crashReport.diag?.fps ?? '?'} fps · last action: {crashReport.diag?.lastOp || 'none'} ·{' '}
                space: {crashReport.diag?.space || '?'}
              </p>
              {crashReport.recent?.length ? (
                <ul className="mt-2 space-y-0.5 font-mono text-[11px] leading-relaxed text-rose-200/80">
                  {crashReport.recent.slice(-6).map((r, i) => (
                    <li key={i} className="truncate">
                      {r.kind}: {r.msg}
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  className="rounded-md bg-rose-500/80 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(JSON.stringify(crashReport, null, 1));
                      setToast('Close report copied. Paste it in the chat');
                    } catch (_) {
                      setToast('Copy failed. Screenshot this card instead');
                    }
                  }}
                >
                  Copy report
                </button>
                <button
                  type="button"
                  className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-semibold text-rose-100 hover:bg-white/20"
                  onClick={() => {
                    setCrashReport(null);
                    try {
                      localStorage.removeItem(CRASH_KEY);
                    } catch (_) {
                      /* ignore */
                    }
                  }}
                >
                  Dismiss
                </button>
              </div>
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

          {/* Debug markers: amber ring = where the last tap landed
              (normalised overlay coordinates); cyan cross = where
              the model's centre projects on screen right now. If the
              ring sits under the fingertip but the cross is not on
              the model's base, rendering diverges; if the cross is
              on the base but away from the ring after a tap, the
              hit test does. */}
          {dbgTap?.normalised && (
            <div
              className="pointer-events-none absolute z-10 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-amber-400"
              style={{ left: `${dbgTap.normalised.x * 100}%`, top: `${dbgTap.normalised.y * 100}%` }}
              aria-hidden="true"
            />
          )}
          {projNorm && (
            <div
              className="pointer-events-none absolute z-10 h-7 w-7 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${projNorm.x * 100}%`, top: `${projNorm.y * 100}%` }}
              aria-hidden="true"
            >
              <span className="absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 bg-cyan-300" />
              <span className="absolute left-0 top-1/2 h-[2px] w-full -translate-y-1/2 bg-cyan-300" />
            </div>
          )}

          {debugVisible ? (
            <div className="absolute left-3 top-1/2 z-10 w-[272px] -translate-y-1/2 rounded-xl bg-black/70 px-3 py-2 font-mono text-[11px] leading-5 text-emerald-300 backdrop-blur-sm" data-ui="true">
              <div className="flex items-center justify-between">
                <span className="font-bold tracking-wide text-emerald-200">AR DEBUG</span>
                <button type="button" aria-label="Hide debug panel" onClick={() => setDebugVisible(false)} className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 focus-visible:outline-2 focus-visible:outline-blue-300">
                  <LuX size={14} aria-hidden="true" />
                </button>
              </div>
              <div>model: {dbgBase?.modelUrl ? dbgBase.modelUrl.split('/').pop() : '—'}</div>
              <div>sys: {sysInfo.space} · {sysInfo.lock} · {sysInfo.fps} fps</div>
              <div>base centre: {dbgFmt(dbgBase?.baseCentre)}</div>
              <div>tap px: {dbgTap?.pixel ? `(${dbgTap.pixel.x}, ${dbgTap.pixel.y})` : '—'}</div>
              <div>tap norm: {dbgTap?.normalised ? `(${dbgTap.normalised.x.toFixed(3)}, ${dbgTap.normalised.y.toFixed(3)})` : '—'}</div>
              <div>hit: {dbgFmt(dbgPlace?.hit)}</div>
              <div>centre after tap: {dbgFmt(dbgPlace?.centre)}</div>
              <div>Δ hit → centre: {dbgDeltaMm == null ? '—' : `${dbgDeltaMm.toFixed(1)} mm`}</div>
              <div>model on screen: {projNorm ? `(${projNorm.x.toFixed(3)}, ${projNorm.y.toFixed(3)})` : '—'}</div>
            </div>
          ) : (
            <button type="button" data-ui="true" onClick={() => setDebugVisible(true)} className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/60 px-2.5 py-1 font-mono text-[10px] font-bold text-emerald-300">
              DBG
            </button>
          )}

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
                    ? `Tap a surface to place the ${MODELS[modelIndex].label.toLowerCase()}`
                    : 'Aim at a flat surface, then tap to place'}
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

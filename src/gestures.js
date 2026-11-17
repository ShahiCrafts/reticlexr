/** Framework-agnostic touch gesture controller for AR DOM overlays.
 * One finger tap -> onTap. One finger drag -> onDrag. Two fingers -> pinch + rotate.
 * Call destroy() when the overlay unmounts.
 *
 * Two-pointer handling is built for phone digitizers, whose samples are
 * noisy enough to make raw pinch/rotate visibly jittery:
 * - The element gets `touch-action: none` (unless it already sets a
 *   touch-action): without it the browser can claim a two-finger touch
 *   as a page pinch-zoom, fire pointercancel mid-gesture, and the
 *   gesture restarts from a fresh baseline — the model jumps.
 * - The gesture's distance and angle are exponentially smoothed
 *   before pinch/rotate are computed, and each component has a
 *   micro-deadzone (pinch 0.4%, rotate ~0.2°). A suppressed component
 *   does NOT advance its baseline, so slow intentional motion still
 *   accumulates and fires, while jitter around a resting position
 *   cancels out instead of shaking the model. Pinch and rotate keep
 *   independent baselines, so a pure pinch does not leak rotation and
 *   vice versa. (The scalars are smoothed, not the pointer positions:
 *   smoothing positions pulls them chord-wise during a twist and the
 *   model would slowly shrink while rotating.)
 *
 * @param {Object} options
 * @param {HTMLElement} [options.element] - Element to listen on
 *   (required — the function throws if it is missing)
 * @param {(point: {x: number, y: number}) => void} [options.onTap] -
 *   Fired for a short, stationary pointerup; payload is the pointer
 *   position in pixels
 * @param {(drag: {dx: number, dy: number, x: number, y: number}) => void} [options.onDrag]
 * @param {(point: {x: number, y: number}) => void} [options.onDragEnd]
 * @param {(pinch: {factor: number, center: {x: number, y: number}}) => void} [options.onPinch]
 * @param {(rotate: {delta: number, center: {x: number, y: number}}) => void} [options.onRotate]
 * @param {number} [options.tapMaxDuration=260] - Max tap duration (ms)
 * @param {number} [options.tapMaxDistance=12] - Max tap movement (px)
 * @param {boolean} [options.preventDefault=true]
 * @param {string} [options.ignoreSelector='[data-ui]'] - Events from
 *   elements matching this selector are ignored
 * @returns {{destroy: () => void}}
 */
export function createARGestureController({
  element,
  onTap,
  onDrag,
  onDragEnd,
  onPinch,
  onRotate,
  tapMaxDuration = 260,
  tapMaxDistance = 12,
  preventDefault = true,
  ignoreSelector = "[data-ui]",
} = {}) {
  if (!element) throw new Error('createARGestureController requires an element');
  // Pointer Events only keep streaming during a touch gesture when the
  // element opts out of browser gesture handling; see the header note.
  if (element.style && !element.style.touchAction) element.style.touchAction = 'none';
  const pointers = new Map();
  let start = null;
  let gesture = null;
  let lastSingle = null;
  let dragTravelled = false;
  // Smoothed two-pointer state (see the header note): the distance,
  // the continuous (unwrapped) raw angle, its smoothed chase value,
  // and the last raw angle for unwrap continuity.
  let smoothD = 0;
  let contA = 0;
  let smoothA = 0;
  let lastRawA = 0;

  // Weight of the newest sample in the smoothed distance/angle, and
  // the per-component deadzones (see the header note).
  const SMOOTHING = 0.45;
  const PINCH_EPS = 0.004;
  const ROTATE_EPS = 0.0035;

  const point = e => ({ x: e.clientX, y: e.clientY });
  const distance = (a,b) => Math.hypot(b.x-a.x,b.y-a.y);
  const angle = (a,b) => Math.atan2(b.y-a.y,b.x-a.x);

  const down = e => {
    if (ignoreSelector && e.target?.closest?.(ignoreSelector)) return;
    if (preventDefault) e.preventDefault();
    element.setPointerCapture?.(e.pointerId);
    pointers.set(e.pointerId, point(e));
    if (pointers.size === 1) {
      start = { ...point(e), time: performance.now() };
      lastSingle = point(e);
      gesture = null;
    } else if (pointers.size === 2) {
      // A second finger ends any single-pointer drag in progress:
      // the gesture becomes a pinch/rotate from here.
      if (dragTravelled) {
        dragTravelled = false;
        const first = [...pointers.values()][0];
        onDragEnd?.({ x: first.x, y: first.y });
      }
      // Seed the smoothed state from the raw geometry so the new
      // baseline starts exactly where the fingers are — no jump.
      const [a,b] = [...pointers.values()];
      smoothD = Math.max(1, distance(a,b));
      contA = angle(a,b);
      smoothA = contA;
      lastRawA = contA;
      gesture = { distance: smoothD, angle: smoothA };
      start = null;
    }
  };
  const move = e => {
    if (!pointers.has(e.pointerId)) return;
    if (preventDefault) e.preventDefault();
    const previous = pointers.get(e.pointerId);
    pointers.set(e.pointerId, point(e));
    if (pointers.size === 2 && gesture) {
      const [a,b] = [...pointers.values()];
      const rawD = Math.max(1, distance(a,b));
      const rawA = angle(a,b);
      let step = rawA - lastRawA;
      if (step > Math.PI) step -= Math.PI * 2;
      if (step < -Math.PI) step += Math.PI * 2;
      lastRawA = rawA;
      contA += step;
      smoothD += (rawD - smoothD) * SMOOTHING;
      smoothA += (contA - smoothA) * SMOOTHING;
      const center = { x:(a.x+b.x)/2, y:(a.y+b.y)/2 };
      const factor = smoothD / gesture.distance;
      if (Math.abs(factor - 1) >= PINCH_EPS) {
        onPinch?.({ factor, center });
        gesture.distance = smoothD;
      }
      const delta = smoothA - gesture.angle;
      if (Math.abs(delta) >= ROTATE_EPS) {
        onRotate?.({ delta, center });
        gesture.angle = smoothA;
      }
    } else if (pointers.size === 1 && lastSingle) {
      const now = point(e);
      const dx = now.x - previous.x, dy = now.y - previous.y;
      if (Math.abs(dx)+Math.abs(dy) > 1) onDrag?.({ dx, dy, x:now.x, y:now.y });
      if (start && distance(start, now) > tapMaxDistance) dragTravelled = true;
      lastSingle = now;
    }
  };
  const up = e => {
    if (preventDefault) e.preventDefault();
    const end = point(e);
    if (pointers.size === 1 && start) {
      const elapsed = performance.now() - start.time;
      const isTap = elapsed <= tapMaxDuration && distance(start,end) <= tapMaxDistance;
      if (isTap) onTap?.(end);
      else if (dragTravelled) onDragEnd?.(end);
      dragTravelled = false;
    }
    pointers.delete(e.pointerId);
    if (pointers.size < 2) gesture = null;
    if (pointers.size === 1) lastSingle = [...pointers.values()][0]; else lastSingle = null;
  };
  const cancel = e => {
    // pointercancel means the gesture was interrupted (system gesture,
    // notification, scroll takeover). Clear the pointer's state WITHOUT
    // the tap check, so an interrupted touch can never fire onTap and
    // place a model (BUG-10).
    if (preventDefault) e.preventDefault();
    if (pointers.size === 1 && dragTravelled) {
      // An interrupted drag still ends (at the last known point), so
      // listeners can close out whatever the drag was driving.
      const last = pointers.get(e.pointerId);
      dragTravelled = false;
      if (last) onDragEnd?.({ x: last.x, y: last.y });
    }
    pointers.delete(e.pointerId);
    if (pointers.size < 2) gesture = null;
    if (pointers.size === 1) lastSingle = [...pointers.values()][0]; else lastSingle = null;
    if (pointers.size === 0) start = null;
  };
  element.addEventListener('pointerdown', down, {passive:false});
  element.addEventListener('pointermove', move, {passive:false});
  element.addEventListener('pointerup', up, {passive:false});
  element.addEventListener('pointercancel', cancel, {passive:false});
  return { destroy() {
    element.removeEventListener('pointerdown', down);
    element.removeEventListener('pointermove', move);
    element.removeEventListener('pointerup', up);
    element.removeEventListener('pointercancel', cancel);
    pointers.clear();
  }};
}

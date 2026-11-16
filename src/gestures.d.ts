/**
 * Type declarations for the gesture controller (`src/gestures.js`).
 * Framework-agnostic Pointer Events controller for AR DOM overlays.
 */

export interface GesturePoint {
  x: number;
  y: number;
}

export interface GestureDragEvent {
  dx: number;
  dy: number;
  x: number;
  y: number;
}

export interface GesturePinchEvent {
  /** Scale factor relative to the previous pinch distance. */
  factor: number;
  center: GesturePoint;
}

export interface GestureRotateEvent {
  /** Rotation delta in radians since the previous move event. */
  delta: number;
  center: GesturePoint;
}

export interface ARGestureOptions {
  /** Element to listen on. Required — the factory throws without it. */
  element: HTMLElement;
  /** Short, stationary one-finger touch; payload is in pixels. */
  onTap?: (point: GesturePoint) => void;
  onDrag?: (event: GestureDragEvent) => void;
  onPinch?: (event: GesturePinchEvent) => void;
  onRotate?: (event: GestureRotateEvent) => void;
  /** Max tap duration in ms. Default 260. */
  tapMaxDuration?: number;
  /** Max tap movement in px. Default 12. */
  tapMaxDistance?: number;
  /** Default true. */
  preventDefault?: boolean;
  /** Events from elements matching this selector are ignored.
   *  Default '[data-ui]'. */
  ignoreSelector?: string;
}

export interface ARGestureController {
  destroy(): void;
}

export declare function createARGestureController(
  options: ARGestureOptions
): ARGestureController;

// PERF-05 evidence harness: is a canvas drawImage composite
// byte-identical to the per-pixel loop in
// ARCoreWeb._composeScreenshot? Vitest suite (TEST-01): run with `npm test`.
//
// The drawImage path cannot run headlessly (no DOM canvas in Node),
// so this harness SIMULATES it with the exact arithmetic the HTML
// canvas spec mandates: a canvas backing store is PREMULTIPLIED, so
// putting the virtual layer into a canvas rounds every channel to
// round(c * a / 255) (information loss whenever 0 < a < 255), and
// source-over compositing then blends in that premultiplied space.
// The loop, by contrast, blends in float and rounds once at the end.
// If the two disagree on a known frame, drawImage is not a
// behaviour-identical replacement — which is the audit's condition
// for making the swap.

// ---- The known frame ------------------------------------------------
// 64x48. Both buffers are GL readbacks (bottom-up rows), exactly as
// _composeScreenshot receives them. Deterministic content:
//   camera:  r = 4x mod 256, g = 5y mod 256, b = (x + 2y) mod 256, a = 255
//   virtual: four vertical bands exercising the alpha edge cases —
//     x < 16:        a = 0,   colour (200, 30, 90)   (invisible colour)
//     16 <= x < 32:  a = 255, colour gradient        (fully opaque)
//     32 <= x < 48:  a = 128, colour (200, 100, 50)  (flat half alpha)
//     x >= 48:       a = (7x + 13y) mod 256, non-uniform colour,
//                    includes a = 1 and a = 254 pixels

import { test, expect } from 'vitest';

test('perf05', async () => {
const W = 64;
const H = 48;

function buildFrame() {
  const camera = new Uint8Array(W * H * 4);
  const virtual = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      camera[i] = (x * 4) % 256;
      camera[i + 1] = (y * 5) % 256;
      camera[i + 2] = (x + y * 2) % 256;
      camera[i + 3] = 255;
      if (x < 16) {
        virtual[i] = 200; virtual[i + 1] = 30; virtual[i + 2] = 90; virtual[i + 3] = 0;
      } else if (x < 32) {
        virtual[i] = (x * 8) % 256; virtual[i + 1] = (y * 5) % 256; virtual[i + 2] = 128; virtual[i + 3] = 255;
      } else if (x < 48) {
        virtual[i] = 200; virtual[i + 1] = 100; virtual[i + 2] = 50; virtual[i + 3] = 128;
      } else {
        virtual[i] = (x * 3) % 256; virtual[i + 1] = (y * 7) % 256; virtual[i + 2] = (x ^ y) % 256;
        virtual[i + 3] = (x * 7 + y * 13) % 256;
      }
    }
  }
  return { camera, virtual };
}

// ---- Implementation 1: the current per-pixel loop -------------------
// Copied arithmetic-for-arithmetic from _composeScreenshot (the row
// flip is preserved: src row = height-1-y).
function loopCompose(cameraPixels, virtualPixels, width, height) {
  const dst = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const src = ((height - 1 - y) * width + x) * 4;
      const d = (y * width + x) * 4;
      const a = virtualPixels[src + 3] / 255;
      const ia = 1 - a;
      dst[d] = virtualPixels[src] * a + cameraPixels[src] * ia;
      dst[d + 1] = virtualPixels[src + 1] * a + cameraPixels[src + 1] * ia;
      dst[d + 2] = virtualPixels[src + 2] * a + cameraPixels[src + 2] * ia;
      dst[d + 3] = 255;
    }
  }
  return dst;
}

// ---- Implementation 2: simulated canvas drawImage path --------------
// Step 1: putImageData stores into a premultiplied backing store.
function toPremultiplied(pixels) {
  const out = new Uint8ClampedArray(pixels.length);
  for (let i = 0; i < pixels.length; i += 4) {
    const a = pixels[i + 3];
    out[i] = Math.round((pixels[i] * a) / 255);
    out[i + 1] = Math.round((pixels[i + 1] * a) / 255);
    out[i + 2] = Math.round((pixels[i + 2] * a) / 255);
    out[i + 3] = a;
  }
  return out;
}

// Steps 2-4: drawImage(source-over) of the virtual canvas over the
// camera canvas (both stored premultiplied; the row flip only
// permutes pixels, it does not change per-pixel arithmetic, so it is
// applied identically to both paths by index mapping), then readback
// unpremultiplies.
function canvasCompose(cameraPixels, virtualPixels, width, height) {
  const camP = toPremultiplied(cameraPixels);
  const virtP = toPremultiplied(virtualPixels);
  const out = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const src = ((height - 1 - y) * width + x) * 4;
      const d = (y * width + x) * 4;
      const va = virtP[src + 3];
      const inv = 255 - va;
      // source-over in premultiplied space; camera alpha is 255, so
      // out alpha is 255 and readback unpremultiply is the identity
      for (let c = 0; c < 3; c++) {
        out[d + c] = virtP[src + c] + Math.round((camP[src + c] * inv) / 255);
      }
      out[d + 3] = 255;
    }
  }
  return out;
}

// ---- Compare ---------------------------------------------------------
const { camera, virtual } = buildFrame();

const check = (name, cond) => expect(cond, name).toBe(true);

// Sanity: the premultiply round-trip ALONE (putImageData then
// getImageData, no compositing) already loses virtual-layer colour
// information at partial alpha — drawImage can never recover it.
{
  const roundTripped = toPremultiplied(virtual);
  let lost = 0;
  for (let i = 0; i < virtual.length; i += 4) {
    const a = virtual[i + 3];
    if (a > 0 && a < 255) {
      // unpremultiply the stored values back for comparison
      for (let c = 0; c < 3; c++) {
        const back = Math.round((roundTripped[i + c] * 255) / a);
        if (back !== virtual[i + c]) lost++;
      }
    }
  }
  console.log(`premultiply round-trip: ${lost} channel values changed`);
  check('round-trip is lossy at partial alpha (expected > 0)', lost > 0);
}

const loopOut = loopCompose(camera, virtual, W, H);
const canvasOut = canvasCompose(camera, virtual, W, H);

let diffChannels = 0;
let diffPixels = 0;
let maxDelta = 0;
const examples = [];
for (let p = 0; p < W * H; p++) {
  let pixelDiffers = false;
  for (let c = 0; c < 4; c++) {
    const d = Math.abs(loopOut[p * 4 + c] - canvasOut[p * 4 + c]);
    if (d > 0) {
      diffChannels++;
      pixelDiffers = true;
      if (d > maxDelta) maxDelta = d;
      if (examples.length < 5 && c < 3) {
        examples.push(
          `pixel ${p} ch${c}: loop=${loopOut[p * 4 + c]} canvas=${canvasOut[p * 4 + c]}`
        );
      }
    }
  }
  if (pixelDiffers) diffPixels++;
}

console.log(`frame: ${W}x${H} (${W * H} pixels, ${W * H * 4} channel values)`);
console.log(`differing pixels: ${diffPixels}, differing channels: ${diffChannels}, max delta: ${maxDelta}`);
examples.forEach((e) => console.log(' ', e));
console.log(
  diffPixels === 0
    ? 'VERDICT: drawImage path is byte-identical on this frame'
    : 'VERDICT: drawImage path is NOT byte-identical — PERF-05 stays wontfix, the loop stays'
);
check('comparison ran over the full frame', loopOut.length === W * H * 4 && canvasOut.length === W * H * 4);
});

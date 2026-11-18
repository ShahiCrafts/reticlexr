import { ImageResponse } from 'next/og';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const alt = 'Reticle XR — high-level AR SDK for React & Capacitor (npm: reticlexr)';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * Social / answer-engine share card, generated at build time from
 * the brand logomark (app/icon.svg) — no binary asset to keep in
 * sync. Next serves this at /opengraph-image and wires it into the
 * og:image / twitter:image tags for every page that does not set
 * its own image.
 */
export default function OpengraphImage() {
  const iconSvg = readFileSync(join(process.cwd(), 'app/icon.svg'), 'utf8');
  const iconSrc = `data:image/svg+xml;base64,${Buffer.from(iconSvg).toString('base64')}`;
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #0a0f1e 0%, #16233f 100%)',
          padding: '0 84px',
        }}
      >
        <img src={iconSrc} width={250} height={250} alt="" />
        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 56 }}>
          <div
            style={{
              fontSize: 27,
              letterSpacing: 6,
              color: '#7daaff',
              fontFamily: 'monospace',
              marginBottom: 10,
            }}
          >
            RETICLE XR
          </div>
          <div style={{ fontSize: 92, fontWeight: 700, color: '#ffffff', lineHeight: 1.05 }}>
            Reticle XR
          </div>
          <div style={{ fontSize: 40, color: '#cbd5e1', marginTop: 22 }}>
            High-level AR SDK for React &amp; Capacitor
          </div>
          <div style={{ fontSize: 34, color: '#94a3b8', marginTop: 10 }}>
            WebXR · ARCore · Three.js · XRAnchors
          </div>
          <div
            style={{ fontSize: 30, color: '#7daaff', fontFamily: 'monospace', marginTop: 34 }}
          >
            $ npm install reticlexr
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}

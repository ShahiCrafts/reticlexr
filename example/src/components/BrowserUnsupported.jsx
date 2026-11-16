import React from 'react';
import './BrowserUnsupported.css';

function BrowserUnsupported() {
  return (
    <div className="browser-unsupported">
      <div className="unsupported-container">
        <h1>📱 AR Integration Playground</h1>
        <div className="unsupported-icon">⚠️</div>

        <h2>WebXR AR Not Available</h2>
        <p className="subtitle">
          This demo places furniture in your space with WebXR immersive-AR, and this browser does not offer it — so the AR view can't start here.
        </p>

        <div className="info-box">
          <h3>To Run This Demo:</h3>
          <ol>
            <li>Use Chrome on an ARCore-capable Android phone</li>
            <li>Open this page over HTTPS (AR needs a secure context)</li>
            <li>Tap "View in your room" to start the AR view</li>
            <li>Grant camera permissions when prompted</li>
          </ol>
        </div>

        <div className="browser-info">
          <h3>ℹ️ What the Demo Needs</h3>
          <p>
            The reticlexr web runtime is built on WebXR, which in practice means:
          </p>
          <ul>
            <li>Android Chrome with WebXR and ARCore support</li>
            <li>An ARCore-compatible device</li>
            <li>A secure context (HTTPS or localhost)</li>
            <li>Camera permission granted</li>
          </ul>
        </div>

        <div className="features-box">
          <h3>✨ What the WebXR Demo Does</h3>
          <ul>
            <li>✓ Real-time surface detection (WebXR hit-test)</li>
            <li>✓ GLB model loading and tap-to-place</li>
            <li>✓ Pinch to scale, twist to rotate</li>
            <li>✓ Colour and texture customization</li>
            <li>✓ Screenshots of the AR view</li>
          </ul>
        </div>

        <p className="footer">
          Running on: <strong>Browser</strong> (WebXR AR unsupported here)
        </p>
      </div>
    </div>
  );
}

export default BrowserUnsupported;

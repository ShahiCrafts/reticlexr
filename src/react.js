/**
 * reticlexr/react — React integration entry (API-02).
 *
 * The React hook lives behind this subpath so that importing the
 * package root (`reticlexr`) is not the only way to reach it: React
 * applications import the hook from here, and the hook module (and
 * its top-level `react` import) stays out of the module graph of
 * consumers who only use the framework-agnostic entries.
 *
 * The root entry still re-exports `useARCore` for backward
 * compatibility; that re-export is deprecated and will be removed
 * in the next major version.
 *
 * @module reticlexr/react
 */

export { useARCore } from './hooks.js';

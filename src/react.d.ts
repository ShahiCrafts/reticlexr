/**
 * Type declarations for the React entry (`reticlexr/react`, API-02).
 * The hook's own declarations live in hooks.d.ts; this subpath simply
 * re-exports them under the React entry point.
 */
export { useARCore } from './hooks.js';
export type {
  ModelTransforms,
  PlacedModel,
  PlaneCounts,
  UseARCoreOptions,
  UseARCoreReturn,
} from './hooks.js';

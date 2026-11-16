// Copies the library's plain-ESM source (../src) into website/sdk-src so the
// live demo can import it with this site's node_modules providing `three`
// and `@capacitor/core`. The repo root has no node_modules of its own, and
// on Vercel only website/ is installed — importing ../src directly would
// fail module resolution in both places. Run automatically via the
// `prebuild` / `predev` npm hooks. sdk-src/ is gitignored.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(here, '..', '..', 'src');
const destDir = path.resolve(here, '..', 'sdk-src');

if (!fs.existsSync(srcDir)) {
  console.error(`[sync-sdk] Library source not found at ${srcDir}`);
  process.exit(1);
}

fs.rmSync(destDir, { recursive: true, force: true });
fs.cpSync(srcDir, destDir, { recursive: true });
console.log(`[sync-sdk] Copied ${srcDir} -> ${destDir}`);

// The demo's GLB models live in example/public/models (binary, already in
// the repo). Copy them into public/models at build time so the website
// itself ships no binaries. public/models/ is gitignored.
const modelsSrc = path.resolve(here, '..', '..', 'example', 'public', 'models');
const modelsDest = path.resolve(here, '..', 'public', 'models');
if (fs.existsSync(modelsSrc)) {
  fs.rmSync(modelsDest, { recursive: true, force: true });
  fs.cpSync(modelsSrc, modelsDest, { recursive: true });
  console.log(`[sync-sdk] Copied ${modelsSrc} -> ${modelsDest}`);
} else {
  console.warn(`[sync-sdk] Example models not found at ${modelsSrc}; demo models unavailable`);
}

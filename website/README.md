# arcore-react documentation site

The documentation site and live demo for
[arcore-react](https://github.com/ShahiCrafts/arcore-react)
(npm: `capacitor-arcore`). Built with Next.js (App Router), Tailwind CSS
and MDX. Every API statement on the site was verified against the library
source; anything unverifiable is marked TODO in the page.

## Local development

```bash
cd website
npm install
npm run dev        # http://localhost:3000
```

`predev`/`prebuild` run `scripts/sync-sdk.mjs` automatically (see below).

## Build & run production locally

```bash
npm run build
npm run start
```

All documentation pages are statically generated at build time.

## How the live demo works

The `/demo` route is a port of `example/src/components/ARPlayground.jsx`
(`components/DemoClient.jsx`). It imports the library source — but the
repo root has no `node_modules`, and on Vercel only this directory is
installed, so importing `../src` directly would fail module resolution
for `three` / `@capacitor/core`. Instead, `scripts/sync-sdk.mjs` copies
`../src` into `website/sdk-src/` (gitignored) before dev/build, and the
demo imports from there, resolving dependencies from this site's
`node_modules` (pinned to the same ranges as the library:
`three ^0.180.0`, `@capacitor/core ^8.5.2`).

The demo needs HTTPS and an ARCore-capable Android phone with Chrome to
actually start AR; everywhere else it explains why it can't.

## Deploying to Vercel

`vercel.json` in this directory declares the framework, install and
build commands. Two ways to deploy:

**Vercel CLI** (from this directory, logged in):

```bash
npx vercel          # preview deployment
npx vercel --prod   # production deployment
```

**Dashboard / Git integration:**

1. Import the `ShahiCrafts/arcore-react` repository in Vercel.
2. Set **Root Directory** to `website`.
3. Framework preset: **Next.js** (auto-detected); build command
   `npm run build`, install command `npm install` (both also pinned in
   `vercel.json`).
4. Node.js version: 20 or later (the package declares `engines >= 20`).

After the first production deploy, point the GitHub repository's
**Website** field and the npm `homepage` field at the production URL.

## Content layout

- `content/docs/**` — MDX pages. Frontmatter: `title`, `description`.
  The sidebar order lives in `lib/nav.ts`; a page must be listed there
  to be routed, searched and included in prev/next navigation.
- `app/docs/[[...slug]]/page.tsx` — renders MDX with Shiki highlighting
  (rehype-pretty-code), a scroll-spy TOC and prev/next links.
- "Edit this page on GitHub" links target the `docs/vercel-site` branch.

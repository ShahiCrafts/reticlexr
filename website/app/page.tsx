import { permanentRedirect } from 'next/navigation';

/** No landing page — the docs are the site's starting page. */
export default function RootPage() {
  permanentRedirect('/docs/getting-started');
}

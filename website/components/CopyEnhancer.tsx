'use client';

import { useEffect } from 'react';

/**
 * Adds a copy button to every Shiki code block inside the article.
 * rehype-pretty-code renders <figure data-rehype-pretty-code-figure>
 * with an optional <figcaption> (filename) and a <pre><code>.
 */
export function CopyEnhancer() {
  useEffect(() => {
    const figures = document.querySelectorAll<HTMLElement>(
      'article figure[data-rehype-pretty-code-figure]',
    );
    const cleanups: Array<() => void> = [];

    figures.forEach((figure) => {
      if (figure.querySelector('[data-copy-btn]')) return;
      const code = figure.querySelector('code');
      if (!code) return;
      figure.style.position = 'relative';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.copyBtn = 'true';
      btn.textContent = 'Copy';
      btn.setAttribute('aria-label', 'Copy code to clipboard');
      btn.className =
        'absolute right-2 top-2 z-10 rounded-md border border-white/15 bg-white/10 px-2 py-1 text-xs font-medium text-slate-100 opacity-0 transition-opacity hover:bg-white/20 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-violet-400 group-hover:opacity-100';
      figure.classList.add('group');
      const onClick = async () => {
        try {
          await navigator.clipboard.writeText(code.innerText.replace(/\n$/, ''));
          btn.textContent = 'Copied';
          setTimeout(() => (btn.textContent = 'Copy'), 1600);
        } catch {
          /* clipboard unavailable */
        }
      };
      btn.addEventListener('click', onClick);
      figure.appendChild(btn);
      cleanups.push(() => btn.removeEventListener('click', onClick));
    });

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return null;
}

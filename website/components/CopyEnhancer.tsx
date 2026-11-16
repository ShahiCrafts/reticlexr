'use client';

import { useEffect } from 'react';

const TERMINAL_LANGS = new Set(['bash', 'sh', 'shell', 'zsh', 'console']);

/**
 * Gives every Shiki code block inside the article a header row + copy button:
 * - blocks with a filename keep their <figcaption> (the button joins it);
 * - terminal/bash blocks without a filename get an injected "Terminal" header;
 * - any other block gets a floating ghost copy button.
 * Panel styling lives in globals.css (.code-panel-header, .code-copy-btn).
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

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.copyBtn = 'true';
      btn.textContent = 'Copy';
      btn.setAttribute('aria-label', 'Copy code to clipboard');
      btn.className = 'code-copy-btn shrink-0 focus-visible:outline-2 focus-visible:outline-blue-400';
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
      cleanups.push(() => btn.removeEventListener('click', onClick));

      const caption = figure.querySelector('figcaption[data-rehype-pretty-code-title]');
      const lang = code.getAttribute('data-language') ?? '';

      if (caption) {
        caption.appendChild(btn);
      } else if (TERMINAL_LANGS.has(lang)) {
        const header = document.createElement('div');
        header.className = 'code-panel-header';
        const label = document.createElement('span');
        label.textContent = 'Terminal';
        header.appendChild(label);
        header.appendChild(btn);
        figure.insertBefore(header, figure.firstChild);
      } else {
        btn.classList.add('absolute', 'right-3', 'top-3', 'z-10', 'bg-white/5');
        figure.appendChild(btn);
      }
    });

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return null;
}

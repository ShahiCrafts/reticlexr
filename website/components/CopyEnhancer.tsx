'use client';

import { useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { LuCheck, LuCopy } from 'react-icons/lu';

const TERMINAL_LANGS = new Set(['bash', 'sh', 'shell', 'zsh', 'console']);

/**
 * Gives every Shiki code block inside the article a header row + copy button:
 * - blocks with a filename keep their <figcaption> (the button joins it);
 * - terminal/bash blocks without a filename get an injected "Terminal" header;
 * - any other block gets a floating ghost copy button in the same header
 *   zone (top 2px, right 12px — where a header-row button would sit).
 * The button is an icon-only clipboard (20px, Vite-docs style) that swaps
 * to a check icon briefly after copying; the glyphs are react-icons
 * components rendered into the button through a small React root, since
 * the button itself is created imperatively. Panel styling lives in
 * globals.css (.code-panel-header, .code-copy-btn).
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
      btn.setAttribute('aria-label', 'Copy code to clipboard');
      btn.className = 'code-copy-btn shrink-0 focus-visible:outline-2 focus-visible:outline-blue-400';
      const root: Root = createRoot(btn);
      const renderIcon = (copied: boolean) =>
        root.render(
          copied ? (
            <LuCheck size={15} strokeWidth={2.2} />
          ) : (
            <LuCopy size={15} strokeWidth={1.8} />
          ),
        );
      renderIcon(false);
      let timer: ReturnType<typeof setTimeout> | undefined;
      const onClick = async () => {
        try {
          await navigator.clipboard.writeText(code.innerText.replace(/\n$/, ''));
          renderIcon(true);
          timer = setTimeout(() => renderIcon(false), 1600);
        } catch {
          /* clipboard unavailable */
        }
      };
      btn.addEventListener('click', onClick);
      cleanups.push(() => {
        btn.removeEventListener('click', onClick);
        if (timer) clearTimeout(timer);
        setTimeout(() => root.unmount(), 0);
      });

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
        // No header row: float the button in the header zone — top 2px and
        // right 12px, exactly where a header-row button sits (the <pre> is
        // inset 4px inside the figure, so the button overlaps the inner
        // panel's top-right corner; its #1d2029 bg matches that panel).
        btn.classList.add('absolute', 'right-3', 'top-0.5', 'z-10', 'bg-[#1d2029]');
        figure.appendChild(btn);
      }
    });

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return null;
}

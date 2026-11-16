import type { ComponentProps } from 'react';
import { Note, Warning, Tip, Todo } from './Callout';
import { InstallTabs } from './InstallTabs';

/** Components available inside MDX pages. */
export const mdxComponents = {
  Note,
  Warning,
  Tip,
  Todo,
  InstallTabs,
};

export type MdxComponents = typeof mdxComponents;
export type AnchorProps = ComponentProps<'a'>;

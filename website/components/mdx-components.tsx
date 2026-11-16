import type { ComponentProps } from 'react';
import { Info, Note, Warning, Tip, Todo } from './Callout';
import { InstallTabs } from './InstallTabs';
import { Step } from './Step';

/** Components available inside MDX pages. */
export const mdxComponents = {
  Info,
  Note,
  Warning,
  Tip,
  Todo,
  InstallTabs,
  Step,
};

export type MdxComponents = typeof mdxComponents;
export type AnchorProps = ComponentProps<'a'>;

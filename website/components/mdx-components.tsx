import type { ComponentProps } from 'react';
import { Note, Warning, Tip, Todo } from './Callout';
import { InstallTabs } from './InstallTabs';
import { Steps, Step, StepText, StepCode } from './Step';

/** Components available inside MDX pages. */
export const mdxComponents = {
  Note,
  Warning,
  Tip,
  Todo,
  InstallTabs,
  Steps,
  Step,
  StepText,
  StepCode,
};

export type MdxComponents = typeof mdxComponents;
export type AnchorProps = ComponentProps<'a'>;

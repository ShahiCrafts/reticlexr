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
  // Wide tables scroll horizontally inside the article instead of
  // stretching the page past the viewport on small screens.
  table: (props: ComponentProps<'table'>) => (
    <div className="overflow-x-auto">
      <table {...props} />
    </div>
  ),
};

export type MdxComponents = typeof mdxComponents;
export type AnchorProps = ComponentProps<'a'>;

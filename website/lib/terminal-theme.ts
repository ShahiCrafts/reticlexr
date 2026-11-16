import githubDark from '@shikijs/themes/github-dark';
import type { ThemeRegistrationRaw } from 'shiki';

/**
 * Terminal theme — github-dark with the shell grammar recoloured to the
 * Tailwind CSS docs terminal palette:
 *
 *   command verb  (npm, npx, ls …)   #F97583 pink
 *   shell builtin (cd, echo, printf) #B392F0 lavender
 *   arguments, strings, flags, rest  #74D4FF sky
 *
 * Every override selector is anchored to the shell grammar (`.shell`
 * scopes / `source.shell`), so JS/TS and all other languages keep stock
 * github-dark colours — the overrides simply never match there.
 *
 * Scopes found by inspecting shiki's bash tokenisation
 * (codeToTokensBase with explanations, github-dark):
 *   command name  … > entity.name.function.call.shell > entity.name.command.shell
 *   builtin       same chain, innermost support.function.builtin.shell
 *   argument      … > meta.argument.shell > string.unquoted.argument.shell
 *   flag          … > string.unquoted.argument.shell > constant.other.option.dash.shell
 *                 (the flag letters sit in a sibling `constant.other.option`)
 *   string quotes … > string.quoted.double.shell > punctuation.definition.string.begin/end.shell
 *   variable      … > variable.other.*.shell (stock theme paints it #e1e4e8)
 *
 * The overrides are appended after github-dark's rules; where specificity
 * ties, the later rule wins, and the `.shell`-suffixed selectors are more
 * specific than the generic `entity` / `support` / `string` / `constant`
 * rules they replace.
 */

const PINK = '#F97583';
const LAVENDER = '#B392F0';
const SKY = '#74D4FF';

type TokenColorRule = NonNullable<ThemeRegistrationRaw['tokenColors']>[number];

const shellOverrides: TokenColorRule[] = [
  // Default for the shell grammar: anything not claimed by a deeper rule
  // (spaces, separators, plain text) is sky. Matches at the root of every
  // shell token's scope stack, so more specific rules still win.
  { scope: 'source.shell', settings: { foreground: SKY } },
  // Command name (first word of a statement) — pink.
  {
    scope: ['entity.name.command.shell', 'entity.name.function.call.shell'],
    settings: { foreground: PINK },
  },
  // Shell builtins — lavender. Innermost scope on builtin tokens, so it
  // beats the command-name rule above for cd/echo/printf/….
  { scope: 'support.function.builtin.shell', settings: { foreground: LAVENDER } },
  // Arguments and strings (including their quote punctuation) — sky.
  {
    scope: [
      'string.unquoted.argument.shell',
      'string.quoted.double.shell',
      'string.quoted.single.shell',
      'string.unquoted.heredoc.shell',
      'string.quoted.heredoc.shell',
      'punctuation.definition.string.begin.shell',
      'punctuation.definition.string.end.shell',
    ],
    settings: { foreground: SKY },
  },
  // Flags (-la, -fsSL) — sky. The dash carries constant.other.option.dash;
  // the letters carry a non-suffixed constant.other.option, anchored here
  // to the shell grammar with a descendant selector.
  {
    scope: ['constant.other.option.dash.shell', 'source.shell constant.other.option'],
    settings: { foreground: SKY },
  },
  // Variables and assignment names/values in shell — sky (stock paints
  // variable.other #e1e4e8, which would read as plain white here).
  { scope: 'source.shell variable.other', settings: { foreground: SKY } },
];

const tokenColors: TokenColorRule[] = [
  ...(githubDark.tokenColors ?? []),
  ...shellOverrides,
];

export const terminalTheme: ThemeRegistrationRaw = {
  ...githubDark,
  name: 'github-dark-terminal',
  // Shiki reads `settings` (falling back to `tokenColors`); rehype-pretty-code
  // detects a raw theme by its `tokenColors` — provide both, same rules.
  settings: tokenColors,
  tokenColors,
};

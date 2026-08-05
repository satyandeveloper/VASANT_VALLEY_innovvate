/**
 * The carbon-copy palette, for the two places that cannot read it from CSS.
 *
 * `app/globals.css` is the source for everything rendered by the browser. Two
 * surfaces can't reach it: the share image goes through satori, which has no
 * Tailwind and no stylesheet, and `global-error.tsx` replaces the root layout
 * so no stylesheet has loaded. Both were typing the hexes out independently,
 * which is three copies of the same eleven values. This makes it two — the CSS
 * `@theme` block and this file — which is the floor, since CSS cannot import
 * TypeScript.
 *
 * Keep these in step with the `@theme` block in app/globals.css.
 */
export const INK = "#24215c";
export const INK_SOFT = "#565398";
export const INK_FAINT = "#8b88b8";
export const DITTO = "#6e5bb8";
export const CANARY = "#f0c64a";
export const CANARY_DEEP = "#b98d12";
export const ROSE = "#d98895";
export const OXBLOOD = "#8e2436";
export const SAGE = "#3f7a5e";
export const PAPER = "#eef0f7";
export const RULE = "#cfd3e6";

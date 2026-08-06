import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored, not project source. `.agents/` and `.claude/` are agent
    // tooling installed by a script (and git-ignored); `supporting/video/` is
    // a separate Remotion package with its own eslint config. Linting them
    // reported ~90 errors in code this project does not own, which drowned out
    // the handful that were actually ours and made `npm run lint` useless as a
    // signal.
    ".agents/**",
    ".claude/**",
    "supporting/**",
  ]),
]);

export default eslintConfig;

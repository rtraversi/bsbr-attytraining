import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "public/**",
      ".open-next/**",
      // Same reason as vitest.config.ts: a worktree is another branch's
      // checkout, including its copy of public/training-content (325 SCORM
      // files). The "public/**" entry above does not reach inside it, so
      // linting the repo root reported 276 errors from code this branch does
      // not own (2026-09-02).
      ".worktrees/**",
    ],
  },
];

export default eslintConfig;

import { fixupConfigRules } from "@eslint/compat";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Architectural boundaries are enforced here rather than by convention, because
 * a rule that only lives in a document stops being true within a few sprints.
 *
 * eslint-config-next still ships plugins that call ESLint 9 context methods.
 * `fixupConfigRules` restores those accessors so the same config runs on ESLint 10.
 */
const eslintConfig = defineConfig([
  ...fixupConfigRules(nextVitals),
  ...fixupConfigRules(nextTs),

  {
    name: "erp/typescript-discipline",
    files: ["**/*.{ts,tsx,mts}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      eqeqeq: ["error", "always", { null: "ignore" }],
      "no-console": ["error", { allow: ["warn", "error"] }],
      "prefer-const": "error",
      "object-shorthand": ["error", "properties"],
    },
  },

  {
    name: "erp/database-access-boundary",
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/repositories/**", "src/lib/prisma.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@prisma/client",
              message:
                "Database access belongs in src/repositories. Call a repository through its service instead.",
            },
            {
              name: "@/lib/prisma",
              message:
                "Only repositories may import the Prisma client. Add or extend a repository method instead.",
            },
          ],
          patterns: [
            {
              group: ["@generated/prisma", "@generated/prisma/**"],
              message:
                "Import Prisma types and the client through src/lib/prisma.ts or a repository, so the generated output stays swappable.",
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },

  {
    name: "erp/server-secrets-boundary",
    files: ["src/components/**/*.tsx", "src/features/**/components/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/config/env",
              message:
                "Server environment must never reach a component bundle. Pass the value in as a prop from a server component.",
            },
            {
              name: "@prisma/client",
              message: "Components must not touch the database layer.",
            },
          ],
          patterns: [
            {
              group: ["@/repositories/*", "@/services/*"],
              message:
                "Components must go through a server action, not the service or repository layer directly.",
            },
            {
              group: ["@generated/prisma", "@generated/prisma/**"],
              message:
                "Components must not reach into the generated database layer. Use the view types in src/types instead.",
            },
          ],
        },
      ],
    },
  },

  {
    name: "erp/layer-direction",
    files: ["src/services/**/*.ts", "src/repositories/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/components/*", "@/features/*", "@/app/*", "react", "next/navigation"],
              message:
                "Services and repositories must stay framework-agnostic so they remain unit-testable.",
            },
          ],
        },
      ],
    },
  },

  {
    name: "erp/tests",
    files: ["tests/**/*.{ts,tsx}", "**/*.test.{ts,tsx}"],
    rules: {
      "no-console": "off",
    },
  },

  {
    // Command-line entry points report their results to a terminal, so stdout is
    // the intended output channel rather than a stray debug statement.
    name: "erp/cli-scripts",
    files: ["prisma/*.ts", "scripts/**/*.ts"],
    rules: {
      "no-console": "off",
    },
  },

  globalIgnores([".next/**", "out/**", "build/**", "coverage/**", "next-env.d.ts", "generated/**"]),
]);

export default eslintConfig;

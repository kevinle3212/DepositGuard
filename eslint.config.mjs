// @ts-check
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import nextPlugin from "@next/eslint-plugin-next";

export default tseslint.config(
    // ── Global ignores ────────────────────────────────────────────────────────
    {
        ignores: [
            "node_modules/**",
            ".next/**",
            "dist/**",
            "out/**",
            "target/**",
            ".anchor/**",
            "coverage/**",
            "*.config.mjs",
            "*.config.ts",
            // Standalone packages with their own configs
            "services/**",
            "agent/**",
            "oracle/**",
            // Docusaurus site — linted independently inside docs/
            "docs/**",
        ],
    },

    // ── TypeScript files ──────────────────────────────────────────────────────
    {
        files: ["**/*.ts", "**/*.tsx"],
        ignores: ["tests/**"],
        extends: [...tseslint.configs.strictTypeChecked, ...tseslint.configs.stylisticTypeChecked],
        languageOptions: {
            parserOptions: {
                project: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            // Explicit types on exported public surfaces; inferred return types are fine for
            // local functions and React components where TypeScript's inference is reliable.
            "@typescript-eslint/explicit-function-return-type": "off",
            "@typescript-eslint/explicit-module-boundary-types": "warn",

            // No unsafe escape hatches
            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/no-unsafe-assignment": "error",
            "@typescript-eslint/no-unsafe-call": "error",
            "@typescript-eslint/no-unsafe-member-access": "error",
            "@typescript-eslint/no-unsafe-return": "error",
            "@typescript-eslint/no-unsafe-argument": "error",
            "@typescript-eslint/no-non-null-assertion": "error",

            // Consistent imports
            "@typescript-eslint/consistent-type-imports": [
                "error",
                { prefer: "type-imports", fixStyle: "inline-type-imports" },
            ],
            "@typescript-eslint/consistent-type-exports": "error",

            // Promise discipline
            "@typescript-eslint/no-floating-promises": "error",
            // Allow async functions in JSX event-handler attributes and callback object properties
            // (e.g. useDropzone's onDrop, React Query's callbacks) since the callee handles
            // the returned promise internally.
            "@typescript-eslint/no-misused-promises": [
                "error",
                { checksVoidReturn: { attributes: false, properties: false } },
            ],
            "@typescript-eslint/promise-function-async": "error",
            "@typescript-eslint/require-await": "error",
            "@typescript-eslint/await-thenable": "error",

            // Strictness
            "@typescript-eslint/no-unused-vars": [
                "error",
                { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
            ],
            "@typescript-eslint/prefer-readonly": "error",
            "@typescript-eslint/prefer-nullish-coalescing": "error",
            "@typescript-eslint/prefer-optional-chain": "error",
            "@typescript-eslint/switch-exhaustiveness-check": "error",
            "@typescript-eslint/no-unnecessary-condition": "error",
            "@typescript-eslint/strict-boolean-expressions": "warn",
            "@typescript-eslint/no-confusing-void-expression": "warn",
            "@typescript-eslint/no-redundant-type-constituents": "error",
            // Allow numbers and booleans in template literals — common in UI formatting.
            "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],

            // General JavaScript
            eqeqeq: ["error", "always", { null: "ignore" }],
            "no-console": "warn",
            "no-var": "error",
            "prefer-const": "error",
            "prefer-template": "error",
            "object-shorthand": "error",
            "no-throw-literal": "off", // replaced by @typescript-eslint version
            "@typescript-eslint/only-throw-error": "error",
            "no-shadow": "off",
            "@typescript-eslint/no-shadow": "error",
        },
    },

    // ── Test files (Anchor + Vitest) — looser type-checking ─────────────────
    {
        files: ["tests/**/*.ts", "**/*.test.ts", "**/*.test.tsx"],
        extends: [...tseslint.configs.recommended, ...tseslint.configs.stylistic],
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-non-null-assertion": "off",
            "@typescript-eslint/no-unsafe-call": "off",
            "@typescript-eslint/no-unsafe-member-access": "off",
            "@typescript-eslint/no-unsafe-assignment": "off",
            "no-console": "off",
        },
    },

    // ── JavaScript / config files (type-checking not available) ───────────────
    {
        files: ["**/*.js", "**/*.cjs"],
        extends: [tseslint.configs.disableTypeChecked],
        rules: {
            "no-var": "error",
            "prefer-const": "error",
            eqeqeq: ["error", "always"],
        },
    },

    // ── React Hooks rules ─────────────────────────────────────────────────────
    {
        files: ["**/*.ts", "**/*.tsx"],
        plugins: { "react-hooks": reactHooksPlugin },
        rules: {
            "react-hooks/rules-of-hooks": "error",
            "react-hooks/exhaustive-deps": "warn",
        },
    },

    // ── Next.js rules ─────────────────────────────────────────────────────────
    {
        files: ["**/*.ts", "**/*.tsx"],
        plugins: { "@next/next": nextPlugin },
        rules: {
            "@next/next/no-img-element": "warn",
        },
    },

    // ── Prettier last — disables all formatting rules ─────────────────────────
    prettierConfig,
);

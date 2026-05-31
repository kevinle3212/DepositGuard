// @ts-check
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";

export default tseslint.config(
    // ── Global ignores ────────────────────────────────────────────────────────
    {
        ignores: [
            "node_modules/**",
            "dist/**",
            "target/**",
            ".anchor/**",
            "coverage/**",
            "*.config.mjs",
        ],
    },

    // ── TypeScript files ──────────────────────────────────────────────────────
    {
        files: ["**/*.ts", "**/*.tsx"],
        extends: [...tseslint.configs.strictTypeChecked, ...tseslint.configs.stylisticTypeChecked],
        languageOptions: {
            parserOptions: {
                project: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            // Explicit types on all public surfaces
            "@typescript-eslint/explicit-function-return-type": "error",
            "@typescript-eslint/explicit-module-boundary-types": "error",

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
            "@typescript-eslint/no-misused-promises": "error",
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
            "@typescript-eslint/strict-boolean-expressions": "error",
            "@typescript-eslint/no-redundant-type-constituents": "error",

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

    // ── Prettier last — disables all formatting rules ─────────────────────────
    prettierConfig,
);

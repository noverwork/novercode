// @ts-check
import eslintJs from "@eslint/js";
import eslintReact from "@eslint-react/eslint-plugin";
import eslintPluginReactHooks from "eslint-plugin-react-hooks";
import eslintPluginReactRefresh from "eslint-plugin-react-refresh";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

const GLOB_TS = ["**/*.ts", "**/*.tsx"];
const GLOB_SRC = ["src/**/*.ts", "src/**/*.tsx"];

export default defineConfig([
  { ignores: ["dist", "src-tauri", "node_modules"] },

  // Base TypeScript configuration
  {
    files: GLOB_TS,
    extends: [eslintJs.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "prefer-const": "error",
      eqeqeq: ["error", "always"],
    },
  },

  // React specific configurations (src only)
  {
    files: GLOB_SRC,
    extends: [
      eslintReact.configs["recommended-typescript"],
      eslintPluginReactHooks.configs.flat?.["recommended-latest"] ?? [],
      eslintPluginReactRefresh.configs.recommended,
    ],
    rules: {
      // shadcn/ui uses forwardRef - ignore for ui components
      "@eslint-react/no-forward-ref": "off",
      // Allow useContext (use() requires Suspense boundary)
      "@eslint-react/no-use-context": "off",
      // Allow Context.Provider pattern
      "@eslint-react/no-context-provider": "off",
    },
  },
]);

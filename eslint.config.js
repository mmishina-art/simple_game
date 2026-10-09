import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["node_modules/", "test-results/", "playwright-report/", ".venv/"] },
  js.configs.recommended,
  {
    // ブラウザで動くゲーム本体
    files: ["web/**/*.js"],
    languageOptions: { globals: globals.browser },
  },
  {
    // サービスワーカーはブラウザとは別の環境で動く
    files: ["web/sw.js"],
    languageOptions: { globals: globals.serviceworker },
  },
  {
    // Node.js で動くテストと設定
    files: ["web/*.test.js", "e2e/**/*.js", "*.config.js"],
    languageOptions: { globals: globals.node },
  },
  {
    // 画面のテストは page.evaluate() などの中身がブラウザで動くので、ブラウザの名前も使える
    files: ["e2e/**/*.js"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    rules: {
      // 使っていない変数はミスのことが多いので止める（catch の引数は除く）
      "no-unused-vars": ["error", { caughtErrors: "none" }],
      eqeqeq: "error", // == ではなく === を使う
      "prefer-const": "error",
    },
  },
];

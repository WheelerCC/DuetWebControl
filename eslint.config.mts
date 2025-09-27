import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginVue from "eslint-plugin-vue";
import { defineConfig } from "eslint/config";
import vueParser from "vue-eslint-parser";

export default defineConfig([
  // { files: ["**/*.{js,mjs,cjs,ts,mts,cts,vue}"], plugins: { js }, extends: ["js/recommended"], languageOptions: { globals: globals.browser } },
  // { files: ["**/*.js"], languageOptions: { sourceType: "commonjs" } },
  // tseslint.configs.recommended,
  // pluginVue.configs["flat/essential"],
  // { files: ["**/*.vue"], languageOptions: { parserOptions: { parser: tseslint.parser } } },
  // {
  //   files: ["**/*.vue"],
    
  //   plugins: { vue: pluginVue },
  //   rules: {
  //     // "vue/no-deprecated-data-object-declaration": "error",
  //     // "vue/no-deprecated-filter": "error",
  //     // "vue/no-deprecated-functional-template": "error",
  //     // "vue/no-deprecated-inline-template": "error",
  //     // "vue/no-deprecated-props-default-this": "error",
  //     // "vue/no-deprecated-scope-attribute": "error",
  //     // "vue/no-deprecated-slot-attribute": "error",
  //     // "vue/no-deprecated-slot-scope-attribute": "error"
  //   }
  // }
  {
    files: ["**/*.vue"],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        ecmaVersion: 2020,
        sourceType: "module",
        extraFileExtensions: [".vue"]
      }
    },
    plugins: { vue: pluginVue },
    extends: [
      pluginVue.configs["flat/vue2-recommended"],
    ],
    rules: {
      "vue/no-deprecated-data-object-declaration": "error",
      "vue/no-deprecated-filter": "error",
      "vue/no-deprecated-functional-template": "error",
      "vue/no-deprecated-inline-template": "error",
      "vue/no-deprecated-props-default-this": "error",
      "vue/no-deprecated-scope-attribute": "error",
      "vue/no-deprecated-slot-attribute": "error",
      "vue/no-deprecated-slot-scope-attribute": "error"
    }
  }
]);

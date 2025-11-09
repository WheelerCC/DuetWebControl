import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginVue from "eslint-plugin-vue";
import { defineConfig, globalIgnores } from "eslint/config";
import vueParser from "vue-eslint-parser";
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import vueI18n from '@intlify/eslint-plugin-vue-i18n'

export default defineConfig([
  globalIgnores(["src/components/ui/**/*.vue"]),
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
      pluginVue.configs["flat/essential"],
      ...vueI18n.configs.recommended,
      eslintPluginPrettierRecommended,
      
    ],
    rules: {
      "vue/no-deprecated-data-object-declaration": "error",
      "vue/no-deprecated-filter": "error",
      "vue/no-deprecated-functional-template": "error",
      "vue/no-deprecated-inline-template": "error",
      "vue/no-deprecated-props-default-this": "error",
      "vue/no-deprecated-scope-attribute": "error",
      "vue/no-deprecated-slot-attribute": "error",
      "vue/no-deprecated-slot-scope-attribute": "error",
      '@intlify/vue-i18n/no-dynamic-keys': 'off',
      '@intlify/vue-i18n/no-raw-text': 'off',
      '@intlify/vue-i18n/no-unused-keys': [
        'error',
        {
          extensions: ['.js', '.vue']
        }
      ]
    },
    settings: {
      'vue-i18n': {
        localeDir: './src/i18n/*.{json,json5,yaml,yml}', // extension is glob formatting!
        // or
        // localeDir: {
        //   pattern: './path/to/locales/*.{json,json5,yaml,yml}', // extension is glob formatting!
        //   localeKey: 'file' // or 'path' or 'key'
        // }
        // or
        // localeDir: [
        //   {
        //     // 'file' case
        //     pattern: './path/to/locales1/*.{json,json5,yaml,yml}',
        //     localeKey: 'file'
        //   },
        //   {
        //     // 'path' case
        //     pattern: './path/to/locales2/*.{json,json5,yaml,yml}',
        //     localePattern: /^.*\/(?<locale>[A-Za-z0-9-_]+)\/.*\.(json5?|ya?ml)$/,
        //     localeKey: 'path'
        //   },
        //   {
        //     // 'key' case
        //     pattern: './path/to/locales3/*.{json,json5,yaml,yml}',
        //     localeKey: 'key'
        //   },
        // ]

        // Specify the version of `vue-i18n` you are using.
        // If not specified, the message will be parsed twice.
        messageSyntaxVersion: '^11.0.0'
      }
    }
  }
]);

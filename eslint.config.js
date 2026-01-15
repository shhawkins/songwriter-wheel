import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', '.vite']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // TODO: Gradually fix these and promote back to 'error'
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      'react-hooks/exhaustive-deps': 'warn',
      // React Compiler rules - disable (not using React Compiler)
      // These are for React 19's experimental compiler optimization
      'react-hooks/rules-of-hooks': 'error', // Keep this strict - actual bug prevention
      'react-hooks/react-compiler': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/variable-declaration': 'off',
      'react-hooks/call-impure-function': 'off',
      'react-hooks/purity': 'off',
      'no-async-promise-executor': 'warn', // Used intentionally in audio engine
      'react-refresh/only-export-components': 'warn', // Dev-only, doesn't affect production
    },
  },
])

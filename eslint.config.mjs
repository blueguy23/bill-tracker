import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import boundaries from 'eslint-plugin-boundaries';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    plugins: { boundaries },
    settings: {
      'import/resolver': { typescript: true },
      'boundaries/elements': [
        { type: 'app',        pattern: ['src/app/**'],        mode: 'full' },
        { type: 'components', pattern: ['src/components/**'],  mode: 'full' },
        { type: 'handlers',   pattern: ['src/handlers/**'],    mode: 'full' },
        { type: 'adapters',   pattern: ['src/adapters/**'],    mode: 'full' },
        { type: 'lib',        pattern: ['src/lib/**'],         mode: 'full' },
        { type: 'types',      pattern: ['src/types/**'],       mode: 'full' },
        { type: 'auth',       pattern: ['src/auth.ts'],        mode: 'full' },
      ],
    },
    rules: {
      'boundaries/dependencies': ['error', {
        default: 'disallow',
        rules: [
          { from: { type: 'app' },        allow: { to: { type: ['app', 'handlers', 'adapters', 'components', 'lib', 'types', 'auth'] } } },
          { from: { type: 'components' }, allow: { to: { type: ['components', 'adapters', 'lib', 'types', 'auth'] } } },
          { from: { type: 'handlers' },   allow: { to: { type: ['handlers', 'adapters', 'lib', 'types'] } } },
          { from: { type: 'adapters' },   allow: { to: { type: ['adapters', 'lib', 'types'] } } },
          { from: { type: 'lib' },        allow: { to: { type: ['lib', 'adapters', 'types'] } } },
          { from: { type: 'types' },      allow: { to: { type: ['types'] } } },
        ],
      }],
    },
  },
  {
    ignores: ['node_modules/**', '.next/**', 'dist/**', 'coverage/**'],
  },
);

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
export default tseslint.config(js.configs.recommended, ...tseslint.configs.recommended, {
  ignores: ['dist'],
  rules: {
    // Mock repository stubs keep their contract-mandated unused params for
    // signature parity with the DashboardRepository interface.
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  },
});

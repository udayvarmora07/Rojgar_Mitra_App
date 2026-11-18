const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    ignores: ['dist/*', 'node_modules/*', 'scraper/venv/*', '.expo/*', 'supabase/functions/*', 'codemods/*/tests/**'],
  },
  {
    // i18next's default export *is* the instance; calling i18n.changeLanguage is correct.
    rules: { 'import/no-named-as-default-member': 'off' },
  },
  {
    // jest.mock() must run before the mocked modules are imported.
    files: ['__tests__/**', 'jest.setup.ts'],
    rules: { 'import/first': 'off', '@typescript-eslint/no-require-imports': 'off' },
  },
];

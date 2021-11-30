module.exports = {
  root: true,
  env: {
    node: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    ecmaFeatures: {
      globalReturn: true,
      impliedStrict: true,
      jsx: true,
    },
  },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier', 'plugin:md/recommended'],
  overrides: [
    {
      files: ['*.md'],
      parser: 'markdown-eslint-parser',
    },
  ],
}

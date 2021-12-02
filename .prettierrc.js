module.exports = {
  printWidth: 120,
  singleQuote: true,
  semi: false,
  trailingComma: 'es5',
  overrides: [
    {
      files: '*.sol',
      options: {
        singleQuote: false,
        semi: true,
      },
    },
  ],
}

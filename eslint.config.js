import neostandard from 'neostandard'
import mochaPlugin from 'eslint-plugin-mocha'

const ignores = [
  'coverage/**/*',
  ...neostandard.resolveIgnoresFromGitignore()
]

export default [
  { ignores },
  ...neostandard(),
  {
    ...mochaPlugin.configs.recommended,
    ignores: ['**/*', '!test/**/*'],
    rules: {
      ...mochaPlugin.configs.recommended.rules,
      // Disable new v11 rule that conflicts with @stylistic/padded-blocks
      'mocha/consistent-spacing-between-blocks': 'off',
    },
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
    },
  },
]

'use strict'

const neostandard = require('neostandard')
const mochaPlugin = require('eslint-plugin-mocha').default

const ignores = [
  'coverage/**/*',
  ...neostandard.resolveIgnoresFromGitignore()
]

module.exports = [
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
]

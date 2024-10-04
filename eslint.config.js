'use strict'

const neostandard = require('neostandard')
const mochaPlugin = require('eslint-plugin-mocha')

const ignores = [
  'coverage/**/*',
  ...neostandard.resolveIgnoresFromGitignore()
]

module.exports = [
  { ignores },
  ...neostandard(),
  {
    ...mochaPlugin.configs.flat.recommended,
    ignores: ['**/*', '!test/**/*'],
  },
]

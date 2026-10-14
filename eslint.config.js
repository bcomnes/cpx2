import { globalIgnores } from 'eslint/config'
import neostandard from 'neostandard'

const ignores = neostandard.resolveIgnoresFromGitignore()

export default [
  globalIgnores(ignores),
  ...neostandard()
]

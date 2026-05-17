import neostandard from 'neostandard'

const ignores = neostandard.resolveIgnoresFromGitignore()

export default [
  { ignores },
  ...neostandard()
]

import { realpathSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

export default function isMain(importMetaUrl) {
  const entryPath = process.argv[1]
  if (!entryPath) return false

  return importMetaUrl === pathToFileURL(realpathSync(entryPath)).href
}

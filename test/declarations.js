import { execSync } from 'node:child_process'
import { cp, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))

/**
 * @param {string} command
 * @param {string} cwd
 * @returns {string}
 */
function run (command, cwd) {
  return execSync(command, { cwd, encoding: 'utf8', timeout: 60000 })
}

test('the packed declarations type-check in a strict NodeNext consumer', async t => {
  const testRoot = join(root, 'test-ws')
  await mkdir(testRoot, { recursive: true })
  const workspace = await mkdtemp(join(testRoot, 'declarations-'))
  t.after(() => rm(workspace, { recursive: true, force: true }))

  const source = join(workspace, 'package')
  const consumer = join(workspace, 'consumer')
  await mkdir(source)
  await mkdir(consumer)

  // Build in a staging copy so normal development never retains generated declarations.
  for (const path of ['lib', 'bin', 'types', 'package.json', 'tsconfig.json', 'declaration.tsconfig.json', 'README.md', 'LICENSE']) {
    await cp(join(root, path), join(source, path), {
      recursive: true,
      filter: path => !(path.startsWith(join(root, 'lib')) && /\.d\.ts(?:\.map)?$/u.test(path))
    })
  }
  await symlink(join(root, 'node_modules'), join(source, 'node_modules'), 'junction')
  run('npm run build', source)
  const packed = /** @type {{ filename: string }[]} */ (
    JSON.parse(run('npm pack --ignore-scripts --json --pack-destination ../consumer', source))
  )
  const tarball = packed[0]?.filename
  if (!tarball) throw new Error('npm pack did not produce a tarball')

  await writeFile(join(consumer, 'package.json'), JSON.stringify({ private: true, type: 'module' }))
  // Match the issue's consumer compiler independently of the compiler used to emit declarations.
  run(`npm install --ignore-scripts --no-package-lock --no-audit --no-fund "./${tarball}" typescript@5.9.3 @types/node@26.0.1`, consumer)
  await writeFile(join(consumer, 'index.ts'), `
import { copy, copySync, watch } from 'cpx2'
import type { CopyOptions, CopySyncOptions, NormalizedOptions, TransformFactory } from 'cpx2'

export { copy, copySync, watch }
export type { CopyOptions, CopySyncOptions, NormalizedOptions, TransformFactory }
`)
  await writeFile(join(consumer, 'tsconfig.json'), JSON.stringify({
    compilerOptions: {
      noEmit: true,
      strict: true,
      skipLibCheck: false,
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      target: 'ES2022',
      types: ['node'],
      typeRoots: ['./node_modules/@types']
    },
    files: ['index.ts']
  }))
  run('node node_modules/typescript/bin/tsc -p tsconfig.json', consumer)
})

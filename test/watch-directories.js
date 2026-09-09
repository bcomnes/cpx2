import assert from 'node:assert/strict'
import { once } from 'node:events'
import { mkdir, mkdtemp, readdir, rm, writeFile, readFile } from 'node:fs/promises'
import path from 'node:path'
import { setTimeout } from 'node:timers/promises'
import { test } from 'node:test'
import { pEvent } from 'p-event'
import { copy, watch } from '../lib/index.js'

for (const includeEmptyDirs of [undefined, false, true]) {
  test(`watch directory parity with includeEmptyDirs=${includeEmptyDirs}`, { timeout: 15000 }, async t => {
    const root = await mkdtemp(path.resolve('test-ws-directories-'))
    const src = path.join(root, 'src')
    const dest = path.join(root, 'watch')
    const copied = path.join(root, 'copy')
    await Promise.all([
      mkdir(path.join(src, 'empty'), { recursive: true }),
      mkdir(path.join(src, 'code-only'), { recursive: true }),
      mkdir(path.join(src, 'nested'), { recursive: true }),
      mkdir(dest),
      mkdir(copied)
    ])
    await writeFile(path.join(src, 'code-only', 'index.js'), 'excluded')
    await writeFile(path.join(src, 'nested', 'kept.txt'), 'included')
    const glob = `${src.replaceAll('\\', '/')}/**/!(*.js)`
    const options = includeEmptyDirs === undefined ? {} : { includeEmptyDirs }
    await copy(glob, copied, options)
    const watcher = watch(glob, dest, options)
    t.after(async () => {
      watcher.close()
      await rm(root, { recursive: true, force: true })
    })
    /** @type {string[]} */
    const copies = []
    /** @type {string[]} */
    const removals = []
    /** @type {unknown[]} */
    const errors = []
    watcher.on('copy', event => copies.push(path.relative(src, event.srcPath)))
    watcher.on('remove', event => removals.push(path.relative(dest, event.path)))
    watcher.on('watch-error', error => errors.push(error))
    await once(watcher, 'watch-ready')
    assert.deepEqual((await readdir(dest, { recursive: true })).sort(), (await readdir(copied, { recursive: true })).sort())
    if (!includeEmptyDirs) assert.deepEqual(copies, [path.join('nested', 'kept.txt')])

    // New directories must still be watched, even if they are not themselves copied.
    const newDir = path.join(src, 'new-empty')
    const normalizedDir = path.relative(process.cwd(), newDir).replaceAll('\\', '/')
    await mkdir(newDir)
    for (let attempts = 0; !watcher.watchers.has(normalizedDir); attempts++) {
      assert.ok(attempts < 300, 'new directory was not watched')
      await setTimeout(10)
    }
    if (includeEmptyDirs) {
      if (!copies.includes('new-empty')) {
        await pEvent(watcher, 'copy', { filter: event => event.srcPath === normalizedDir, timeout: 3000 })
      }
    } else {
      assert.ok(!copies.includes('new-empty'))
      assert.ok(!(await readdir(dest)).includes('new-empty'))
    }
    const file = path.join(newDir, 'later.txt')
    const fileCopied = pEvent(watcher, 'copy', { filter: event => path.resolve(event.srcPath) === file, timeout: 3000 })
    await writeFile(file, 'found after startup')
    await fileCopied
    assert.equal(await readFile(path.join(dest, 'new-empty', 'later.txt'), 'utf8'), 'found after startup')

    const fileRemoved = pEvent(watcher, 'remove', { filter: event => event.path.endsWith('later.txt'), timeout: 3000 })
    await rm(newDir, { recursive: true })
    await fileRemoved
    if (includeEmptyDirs) {
      if (!removals.includes('new-empty')) {
        await pEvent(watcher, 'remove', { filter: event => event.path.endsWith('new-empty'), timeout: 3000 })
      }
    } else {
      assert.deepEqual(removals, [path.join('new-empty', 'later.txt')])
      assert.ok(!copies.includes('new-empty'))
    }
    assert.deepEqual(errors, [])
  })
}

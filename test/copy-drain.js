import assert from 'node:assert/strict'
import fs from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { Transform } from 'node:stream'
import { test } from 'node:test'
import { setImmediate } from 'node:timers/promises'
import { copy } from '#lib'

/** @import { TestContext } from 'node:test' */

/** @param {TestContext} t */
async function setup (t) {
  const root = await mkdtemp(path.resolve('test-ws-copy-drain-'))
  t.after(() => rm(root, { force: true, recursive: true }))
  const src = path.join(root, 'src')
  const out = path.join(root, 'out')
  await mkdir(src)
  return { src, out, glob: `${src.replaceAll('\\', '/')}/**` }
}

test('copy does not reject while a sibling is still writing', async t => {
  const { src, out, glob } = await setup(t)
  await writeFile(path.join(src, 'broken.txt'), 'broken')
  await writeFile(path.join(src, 'paused.txt'), 'keep me')
  const entered = Promise.withResolvers()
  const broken = Promise.withResolvers()
  const release = Promise.withResolvers()
  const result = copy(glob, out, {
    transform: [source => new Transform({
      transform (chunk, _encoding, callback) {
        if (path.basename(source) === 'paused.txt') {
          entered.resolve(undefined)
          release.promise.then(() => callback(null, chunk))
        } else {
          entered.promise.then(() => {
            callback(new Error('broken transform'))
            broken.resolve(undefined)
          })
        }
      },
    })],
  })
  let rejected = false
  const checked = assert.rejects(result, /broken transform/).then(() => { rejected = true })
  try {
    await broken.promise
    await setImmediate()
    assert.equal(rejected, false)
  } finally {
    release.resolve(undefined)
    await checked
  }
  assert.equal(await readFile(path.join(out, 'paused.txt'), 'utf8'), 'keep me')
})

test('copy waits for an opened output descriptor to close after a transform error', async t => {
  const { src, out, glob } = await setup(t)
  await writeFile(path.join(src, 'file.txt'), 'contents')
  const opened = Promise.withResolvers()
  const closing = Promise.withResolvers()
  const release = Promise.withResolvers()
  const createWriteStream = fs.createWriteStream
  t.mock.method(fs, 'createWriteStream', (/** @type {string} */ filename) => {
    const writer = createWriteStream(filename, {
      fs: {
        open: fs.open,
        write: fs.write,
        close (fd, callback) {
          closing.resolve(undefined)
          release.promise.then(() => fs.close(fd, callback))
        },
      },
    })
    writer.once('open', () => opened.resolve(undefined))
    return writer
  })
  const result = copy(glob, out, {
    transform: [() => new Transform({
      transform (_chunk, _encoding, callback) {
        opened.promise.then(() => callback(new Error('error after open')))
      },
    })],
  })
  let rejected = false
  const checked = assert.rejects(result, /error after open/).then(() => { rejected = true })
  try {
    await closing.promise
    await setImmediate()
    assert.equal(rejected, false)
  } finally {
    release.resolve(undefined)
    await checked
  }
})

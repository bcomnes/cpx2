/**
 * @import { TestContext } from 'node:test'
 * @import { FSWatcher } from 'node:fs'
 */

import assert from 'node:assert/strict'
import { once } from 'node:events'
import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import path from 'node:path'
import { setImmediate } from 'node:timers/promises'
import { describe, test } from 'node:test'
import Watcher from '../lib/utils/watcher.js'
import normalizeOptions from '../lib/utils/normalize-options.js'
import { watch } from '#lib'

/**
 * Track actual native handles and traversal completion, without timing sleeps.
 * @param {TestContext} t
 */
async function setup (t) {
  const root = await fsPromises.mkdtemp(path.resolve('test-ws-lifecycle-'))
  const src = path.join(root, 'src')
  await fsPromises.mkdir(src)
  const watcher = new Watcher(normalizeOptions(`${src.replaceAll('\\', '/')}/**`, path.join(root, 'out'), {}))
  // Access private methods only to observe completion or hold asynchronous work.
  const internals = /** @type {{
   * addDirectory: (dir: string) => Promise<void>,
   * copy: (source: string) => Promise<void>,
   * onTrigger: () => void
   * }} */ (/** @type {unknown} */ (watcher))
  /** @type {Promise<void>[]} */
  const traversals = []
  const addDirectory = internals.addDirectory.bind(watcher)
  t.mock.method(internals, 'addDirectory', (/** @type {string} */ dir) => {
    const traversal = addDirectory(dir)
    traversals.push(traversal)
    return traversal
  })

  /** @type {Set<FSWatcher>} */
  const active = new Set()
  /** @type {Promise<unknown>[]} */
  const closures = []
  const nativeWatch = fs.watch
  const acquisition = t.mock.method(fs, 'watch', (/** @type {string} */ filename) => {
    const handle = nativeWatch(filename)
    active.add(handle)
    closures.push(once(handle, 'close'))
    handle.once('close', () => active.delete(handle))
    return handle
  })
  const ready = t.mock.fn()
  const error = t.mock.fn()
  watcher.on('watch-ready', ready)
  watcher.on('watch-error', error)

  async function drain () {
    await Promise.allSettled(traversals)
    // Flush deferred events after all traversal callbacks have finished.
    await setImmediate()
  }

  t.after(async () => {
    watcher.close()
    await drain()
    watcher.close()
    // Clean up leaked or overwritten handles even when a regression fails.
    for (const handle of active) {
      handle.close()
    }
    await Promise.all(closures)
    await fsPromises.rm(root, { recursive: true, force: true })
  })

  return { watcher, internals, src, active, closures, acquisition, ready, error, traversals, drain }
}

/**
 * Hold the symlink check, after addDirectory's first open-state guard.
 * @param {TestContext} t
 * @param {string} dir
 */
function holdSymlinkCheck (t, dir) {
  const entered = Promise.withResolvers()
  const release = Promise.withResolvers()
  const lstat = fsPromises.lstat
  let checks = 0
  t.mock.method(fsPromises, 'lstat', async (/** @type {string} */ filename) => {
    if (path.resolve(String(filename)) === dir && ++checks === 2) {
      entered.resolve(undefined)
      await release.promise
    }
    return lstat(filename)
  })
  return { entered: entered.promise, release: () => release.resolve(undefined) }
}

describe('watch session lifecycle', { concurrency: false }, () => {
  test('close during initial traversal cannot acquire handles or announce readiness', async t => {
    const h = await setup(t)
    const gate = holdSymlinkCheck(t, h.src)
    try {
      h.watcher.open()
      await gate.entered
      h.watcher.close()
    } finally {
      gate.release()
    }
    await h.drain()
    assert.equal(h.acquisition.mock.callCount(), 0)
    assert.equal(h.watcher.watchers.size, 0)
    assert.equal(h.active.size, 0)
    assert.equal(h.ready.mock.callCount(), 0)
    assert.equal(h.error.mock.callCount(), 0)
  })

  test('an old traversal cannot join a reopened session', async t => {
    const h = await setup(t)
    const gate = holdSymlinkCheck(t, h.src)
    try {
      h.watcher.open()
      await gate.entered
      h.watcher.close()
      const ready = once(h.watcher, 'watch-ready')
      h.watcher.open()
      await ready
      assert.equal(h.acquisition.mock.callCount(), 1)
    } finally {
      gate.release()
    }
    await h.drain()
    assert.equal(h.acquisition.mock.callCount(), 1)
    assert.equal(h.ready.mock.callCount(), 1)
    assert.equal(h.watcher.watchers.size, 1)
    h.watcher.close()
    await Promise.all(h.closures)
    assert.equal(h.active.size, 0)
  })

  test('an old traversal cannot acquire handles while the new scan is still pending', async t => {
    const h = await setup(t)
    const oldScan = holdSymlinkCheck(t, h.src)
    try {
      h.watcher.open()
      await oldScan.entered
      h.watcher.close()
      const newScan = holdSymlinkCheck(t, h.src)
      try {
        h.watcher.open()
        await newScan.entered
        oldScan.release()
        await h.traversals[0]
        await setImmediate()
        assert.equal(h.acquisition.mock.callCount(), 0)
        assert.equal(h.ready.mock.callCount(), 0)
      } finally {
        newScan.release()
      }
    } finally {
      oldScan.release()
    }
    await h.drain()
    assert.equal(h.acquisition.mock.callCount(), 1)
    assert.equal(h.ready.mock.callCount(), 1)
  })

  test('close during discovery of a new directory cannot acquire another handle', async t => {
    const h = await setup(t)
    const ready = once(h.watcher, 'watch-ready')
    h.watcher.open()
    await ready
    const child = path.join(h.src, 'child')
    const gate = holdSymlinkCheck(t, child)
    try {
      await fsPromises.mkdir(child)
      await gate.entered
      h.watcher.close()
    } finally {
      gate.release()
    }
    await h.drain()
    assert.equal(h.acquisition.mock.callCount(), 1)
    await Promise.all(h.closures)
    assert.equal(h.watcher.watchers.size, 0)
    assert.equal(h.active.size, 0)
    assert.equal(h.ready.mock.callCount(), 1)
    assert.equal(h.error.mock.callCount(), 0)
  })

  for (const close of [false, true]) {
    test(`traversal errors ${close ? 'are ignored after close' : 'are reported while open without readiness'}`, async t => {
      const h = await setup(t)
      const gate = holdSymlinkCheck(t, h.src)
      try {
        h.watcher.open()
        await gate.entered
        if (close) {
          h.watcher.close()
        }
        await fsPromises.rmdir(h.src)
      } finally {
        gate.release()
      }
      await h.drain()
      assert.equal(h.acquisition.mock.callCount(), 0)
      assert.equal(h.ready.mock.callCount(), 0)
      assert.equal(h.error.mock.callCount(), close ? 0 : 1)
    })
  }

  test('old native callbacks cannot change a reopened session', async t => {
    const h = await setup(t)
    let ready = once(h.watcher, 'watch-ready')
    h.watcher.open()
    await ready
    const oldHandle = [...h.active][0]
    assert(oldHandle)

    const child = path.join(h.src, 'child')
    const stat = fsPromises.stat
    const directoryStat = await stat(h.src)
    const entered = Promise.withResolvers()
    const release = Promise.withResolvers()
    t.mock.method(fsPromises, 'stat', async (/** @type {string} */ filename) => {
      if (path.resolve(filename) === child) {
        entered.resolve(undefined)
        await release.promise
        return directoryStat
      }
      return stat(filename)
    })
    try {
      // Deliver a native event deterministically, then hold its async stat.
      oldHandle.emit('change', 'rename', 'child')
      await entered.promise
      h.watcher.close()
      ready = once(h.watcher, 'watch-ready')
      h.watcher.open()
      await ready
      oldHandle.emit('error', new Error('old native watcher error'))
      assert.equal(h.watcher.watchers.size, 1)
    } finally {
      release.resolve(undefined)
    }
    await h.drain()
    assert.equal(h.traversals.length, 2)
    assert.equal(h.error.mock.callCount(), 0)
    assert.equal(h.ready.mock.callCount(), 2)
  })

  test('readiness already queued for next tick is suppressed by close', async t => {
    const h = await setup(t)
    h.watcher.open()
    await h.traversals[0]
    // open() has queued readiness, but its next-tick delivery has not run.
    h.watcher.close()
    await h.drain()
    await Promise.all(h.closures)
    assert.equal(h.ready.mock.callCount(), 0)
    assert.equal(h.active.size, 0)
  })

  for (const operation of ['initial copy', 'queued copy', 'removal']) {
    test(`closeAndDrain waits for a real ${operation}`, async t => {
      const h = await setup(t)
      const source = path.join(h.src, 'file.txt')
      const output = path.join(h.watcher.outputDir, 'file.txt')
      await fsPromises.writeFile(source, 'contents')
      if (operation !== 'initial copy') {
        const ready = once(h.watcher, 'watch-ready')
        h.watcher.open()
        await ready
      }

      const entered = Promise.withResolvers()
      const release = Promise.withResolvers()
      if (operation === 'removal') {
        const unlink = fsPromises.unlink
        t.mock.method(fsPromises, 'unlink', async (/** @type {string} */ filename) => {
          if (path.resolve(filename) === output) {
            entered.resolve(undefined)
            await release.promise
          }
          return unlink(filename)
        })
      } else {
        const mkdir = fsPromises.mkdir
        t.mock.method(fsPromises, 'mkdir', async (/** @type {string} */ dir, /** @type {{ recursive: true }} */ options) => {
          if (path.resolve(dir) === path.dirname(output)) {
            entered.resolve(undefined)
            await release.promise
          }
          return mkdir(dir, options)
        })
      }

      /** @type {Promise<void>[]} */
      const drains = []
      try {
        if (operation === 'initial copy') h.watcher.open()
        else {
          const queued = path.join(h.src, 'queued.txt')
          await fsPromises.writeFile(queued, 'must not copy')
          h.watcher.queue.set(source, operation === 'removal' ? 'remove' : 'change')
          h.watcher.queue.set(queued, 'add')
          h.internals.onTrigger()
        }
        await entered.promise
        h.watcher.close()
        let drained = false
        drains.push(h.watcher.closeAndDrain().then(() => { drained = true }), h.watcher.closeAndDrain())
        await setImmediate()
        assert.equal(drained, false)
      } finally {
        release.resolve(undefined)
        await Promise.all(drains)
      }
      if (operation === 'removal') await assert.rejects(fsPromises.access(output), { code: 'ENOENT' })
      else assert.equal(await fsPromises.readFile(output, 'utf8'), 'contents')
      await assert.rejects(fsPromises.access(path.join(h.watcher.outputDir, 'queued.txt')), { code: 'ENOENT' })
    })
  }

  test('closeAndDrain waits for startup cleanup and prevents traversal afterward', async t => {
    const h = await setup(t)
    const output = path.join(h.watcher.outputDir, 'stale.txt')
    await fsPromises.mkdir(h.watcher.outputDir)
    await fsPromises.writeFile(output, 'stale')
    await fsPromises.writeFile(path.join(h.src, 'fresh.txt'), 'must not copy')
    const entered = Promise.withResolvers()
    const release = Promise.withResolvers()
    const unlink = fsPromises.unlink
    t.mock.method(fsPromises, 'unlink', async (/** @type {string} */ filename) => {
      if (path.resolve(filename) === output) {
        entered.resolve(undefined)
        await release.promise
      }
      return unlink(filename)
    })
    const watcher = watch(`${h.src.replaceAll('\\', '/')}/**/*.txt`, h.watcher.outputDir, { clean: true })
    const ready = t.mock.fn()
    watcher.on('watch-ready', ready)
    try {
      await entered.promise
      let drained = false
      watcher.closeAndDrain().then(() => { drained = true })
      await setImmediate()
      assert.equal(drained, false)
    } finally {
      release.resolve(undefined)
      await watcher.closeAndDrain()
    }
    await setImmediate()
    assert.equal(ready.mock.callCount(), 0)
    assert.equal(h.acquisition.mock.callCount(), 0)
    await assert.rejects(fsPromises.access(output), { code: 'ENOENT' })
  })

  test('old initial copies cannot complete readiness for a reopened session', async t => {
    const h = await setup(t)
    await fsPromises.writeFile(path.join(h.src, 'file.txt'), 'hello')
    const oldCopy = Promise.withResolvers()
    const newCopy = Promise.withResolvers()
    let copies = 0
    t.mock.method(h.internals, 'copy', () => {
      copies += 1
      return copies === 1 ? oldCopy.promise : newCopy.promise
    })
    try {
      h.watcher.open()
      await h.drain()
      assert.equal(copies, 1)
      h.watcher.close()
      h.watcher.open()
      await h.drain()
      assert.equal(copies, 2)

      oldCopy.resolve(undefined)
      await setImmediate()
      assert.equal(h.ready.mock.callCount(), 0)

      const ready = once(h.watcher, 'watch-ready')
      newCopy.resolve(undefined)
      await ready
      assert.equal(h.ready.mock.callCount(), 1)
    } finally {
      oldCopy.resolve(undefined)
      newCopy.resolve(undefined)
    }
  })

  test('an in-flight queued copy cannot retry into a reopened session', async t => {
    const h = await setup(t)
    let ready = once(h.watcher, 'watch-ready')
    h.watcher.open()
    await ready
    const copy = Promise.withResolvers()
    t.mock.method(h.internals, 'copy', () => copy.promise)
    try {
      h.watcher.queue.set(path.join(h.src, 'file.txt'), 'add')
      h.internals.onTrigger()
      h.watcher.close()
      ready = once(h.watcher, 'watch-ready')
      h.watcher.open()
      await ready
    } finally {
      copy.reject(Object.assign(new Error('retryable copy failure'), { code: 'EPERM' }))
    }
    await setImmediate()
    assert.equal(h.watcher.queue.size, 0)
    assert.equal(h.watcher.retries.size, 0)
    assert.equal(h.error.mock.callCount(), 0)
  })
})

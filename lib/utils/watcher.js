/**
 * @author Toru Nagashima <https://github.com/mysticatea>
 * @copyright 2017 Toru Nagashima. All rights reserved.
 * See LICENSE file in root directory for full license.
 */

/**
 * @import { NormalizedOptions } from './normalize-options.js'
 * @import { Stats, FSWatcher } from 'node:fs'
 */

import { EventEmitter } from 'node:events'
import path from 'node:path'
import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import debounce from 'debounce'
import { Minimatch } from 'minimatch'
import ignore from 'ignore'
import copyFile from './copy-file.js'
import normalizePath from './normalize-path.js'
import removeFile from './remove-file.js'

// ------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------

/**
 * @param {string} dirRoot
 * @param {boolean} dereference
 * @param {ReturnType<typeof ignore>} ig
 * @param {(dirPath: string, files: Map<string, Stats>) => Promise<void>} callback
 * @returns {Promise<void>}
 */
async function walkDirectories (dirRoot, dereference, ig, callback) {
  /** @type {Array<{ path: string, files: Map<string, Stats> }>} */
  const stack = []

  // Check whether the root is a directory.
  {
    const stat = await fsPromises.stat(dirRoot)
    if (!stat.isDirectory()) {
      return
    }
    stack.push({
      path: dirRoot,
      files: new Map()
    })
  }

  // Walk it recursively.
  while (stack.length > 0) {
    const entry = /** @type {{ path: string, files: Map<string, Stats> }} */ (stack.pop())
    const stat = await fsPromises.lstat(entry.path)

    if (dereference || !stat.isSymbolicLink()) {
      const children = await fsPromises.readdir(entry.path)

      for (let i = children.length - 1; i >= 0; --i) {
        const child = /** @type {string} */ (children[i])
        const childPath = normalizePath(path.join(entry.path, child))
        const childStat = await fsPromises.stat(childPath)

        if (
          ig.ignores(
            childStat.isDirectory() ? `${childPath}/` : childPath
          )
        ) {
          continue
        }

        entry.files.set(childPath, childStat)

        if (childStat.isDirectory()) {
          stack.push({
            path: childPath,
            files: new Map()
          })
        }
      }
    }

    await callback(entry.path, entry.files)
  }
}

// ------------------------------------------------------------------------------
// Exports
// ------------------------------------------------------------------------------

/**
 * Watcher class.
 *
 * The watcher observes files and directories which are matched to the given
 * glob pattern.
 */
export default class Watcher extends EventEmitter {
  /**
   * Initialize this watcher.
   * @param {NormalizedOptions} options Normalized options.
   */
  constructor (options) {
    super()

    /** @type {string} */
    this.baseDir = options.baseDir
    /** @type {boolean} */
    this.dereference = options.dereference
    /** @type {boolean} */
    this.includeEmptyDirs = options.includeEmptyDirs
    /** @type {boolean} */
    this.initialCopy = options.initialCopy
    /** @type {Minimatch} */
    this.matcher = new Minimatch(options.source)
    /** @type {ReturnType<typeof ignore>} */
    this.ignore = ignore({ allowRelativePaths: true }).add(options.ignore ?? [])
    /** @type {string} */
    this.outputDir = options.outputDir
    /** @type {boolean} */
    this.force = options.force
    /** @type {boolean} */
    this.preserve = options.preserve
    /** @type {string} */
    this.source = options.source
    /** @type {(sourcePath: string) => string} */
    this.toDestination = options.toDestination
    /** @type {NormalizedOptions['transform']} */
    this.transform = options.transform
    /** @type {boolean} */
    this.update = options.update

    // private state
    /** @type {number} */
    this.initialCopyCount = 0
    this.onDoneInitialCopy = () => {
      this.initialCopyCount -= 1
      this.emitReadyEventIfReady()
    }
    /** @type {boolean} */
    this.pending = false
    /** @type {Map<string, 'add' | 'change' | 'remove'>} */
    this.queue = new Map()
    /** @type {boolean} */
    this.ready = false
    /** @type {Map<string, number>} */
    this.retries = new Map()
    /** @type {ReturnType<typeof debounce> | null} */
    this.trigger = null
    /** @type {Map<string, { watcher: FSWatcher, files: Map<string, Stats> }>} */
    this.watchers = new Map()
  }

  /**
   * Open this watcher.
   * @returns {void}
   */
  open () {
    this.close()

    this.trigger = debounce(this.onTrigger.bind(this), 250)

    // Start to watch the change of child files for each directory.
    this.addDirectory(this.baseDir)
      .then(() => {
        this.onReady()
      })
      .catch(error => {
        this.onError(error)
      })
  }

  /**
   * Close this watcher.
   * @returns {void}
   */
  close () {
    if (this.trigger != null) {
      this.trigger.clear()
      this.trigger = null
    }
    for (const entry of this.watchers.values()) {
      entry.watcher.close()
    }
    this.watchers.clear()
  }

  /**
   * Start watching the files of the given directory.
   * @param {string} dirRoot The path to the root directory to watch.
   * @returns {Promise<void>}
   * @private
   */
  addDirectory (dirRoot) {
    return walkDirectories(
      dirRoot,
      this.dereference,
      this.ignore,
      async (dirPath, files) => {
        if (this.trigger == null || this.watchers.has(dirPath)) {
          return
        }

        // Skip the content of symbolic links by default.
        if (
          !this.dereference &&
          (await fsPromises.lstat(dirPath)).isSymbolicLink()
        ) {
          this.onAdded(dirPath)
          return
        }

        // Start watching.
        const watcher = fs
          .watch(dirPath)
          .on('change', (_type, filename) => {
            if (filename == null) {
              return
            }
            const sourcePath = normalizePath(
              path.join(dirPath, String(filename))
            )

            fsPromises.stat(sourcePath).then(
              stat => {
                this.classifyFileChange(files, sourcePath, stat)
              },
              error => {
                if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') {
                  this.classifyFileChange(files, sourcePath, null)
                } else {
                  this.onError(error)
                }
              }
            )
          })
          .on('error', () => {
            this.removeDirectory(dirPath)
          })
        this.watchers.set(dirPath, { watcher, files })

        // Emit "added" events.
        this.onAdded(dirPath)
        for (const entry of files.entries()) {
          const filePath = entry[0]
          const stat = entry[1]

          if (!stat.isDirectory()) {
            this.onAdded(filePath)
          }
        }
      }
    )
  }

  /**
   * Stop watching the files of the given directory.
   * @param {string} dirRoot The path to the root directory to watch.
   * @returns {void}
   * @private
   */
  removeDirectory (dirRoot) {
    const stack = [dirRoot]
    const eventStack = []

    while (stack.length > 0) {
      const dirPath = /** @type {string} */ (stack.pop())
      const entry = this.watchers.get(dirPath)
      this.watchers.delete(dirPath)

      if (entry == null) {
        continue
      }
      entry.watcher.close()
      eventStack.push(dirPath)

      for (const childEntry of entry.files.entries()) {
        const childPath = childEntry[0]
        const childStat = childEntry[1]

        if (childStat.isDirectory()) {
          stack.push(childPath)
        } else {
          eventStack.push(childPath)
        }
      }
    }

    for (let i = eventStack.length - 1; i >= 0; --i) {
      this.onRemoved(/** @type {string} */ (eventStack[i]))
    }
  }

  /**
   * Classify the given file change.
   * @param {Map<string, Stats>} files The current files.
   * @param {string} sourcePath The path to a changed file.
   * @param {Stats | null} currStat The stats object of the changed file, or null if deleted.
   * @returns {void}
   * @private
   */
  classifyFileChange (files, sourcePath, currStat) {
    if (this.trigger == null) {
      return
    }

    const prevStat = files.get(sourcePath)
    if (currStat != null) {
      if (prevStat == null) {
        files.set(sourcePath, currStat)

        // Watch recursively if this is a directory.
        if (currStat.isDirectory()) {
          this.addDirectory(sourcePath)
        } else {
          this.onAdded(sourcePath)
        }
      } else if (!currStat.isDirectory()) {
        files.set(sourcePath, currStat)
        this.onChanged(sourcePath)
      }
    } else if (prevStat != null) {
      files.delete(sourcePath)

      // Unwatch recursively if this is a directory.
      if (prevStat.isDirectory()) {
        this.removeDirectory(sourcePath)
      } else {
        this.onRemoved(sourcePath)
      }
    }
  }

  /**
   * Called when this watcher got ready.
   * @returns {void}
   * @private
   */
  onReady () {
    this.ready = true
    this.emitReadyEventIfReady()
  }

  /**
   * Called when this watcher detected that a file had been added.
   * @param {string} sourcePath The path to the added file.
   * @returns {void}
   * @private
   */
  onAdded (sourcePath) {
    const normalizedPath = normalizePath(sourcePath)
    if (!this.matcher.match(normalizedPath)) {
      return
    }

    if (this.ignore.ignores(normalizedPath)) {
      return
    }

    if (this.ready) {
      this.enqueueAdd(normalizedPath)
    } else if (this.initialCopy) {
      this.initialCopyCount += 1
      this.copy(normalizedPath).then(
        this.onDoneInitialCopy,
        this.onDoneInitialCopy
      )
    }
  }

  /**
   * Called when this watcher detected that a file had been removed.
   * @param {string} sourcePath The path to the removed file.
   * @returns {void}
   * @private
   */
  onRemoved (sourcePath) {
    const normalizedPath = normalizePath(sourcePath)

    if (this.ignore.ignores(normalizedPath)) {
      return
    }

    if (this.matcher.match(normalizedPath)) {
      this.enqueueRemove(normalizedPath)
    }
  }

  /**
   * Called when this watcher detected that a file had been changed.
   * @param {string} sourcePath The path to the changed file.
   * @returns {void}
   * @private
   */
  onChanged (sourcePath) {
    const normalizedPath = normalizePath(sourcePath)

    if (this.ignore.ignores(normalizedPath)) {
      return
    }

    if (this.matcher.match(normalizedPath)) {
      this.enqueueChange(normalizedPath)
    }
  }

  /**
   * Called when this watcher threw an error.
   * @param {unknown} error The thrown error.
   * @returns {void}
   * @private
   */
  onError (error) {
    this.emit('watch-error', error)
  }

  /**
   * Called by `this.trigger()`. Executes queued copy/remove actions.
   * @returns {void}
   * @private
   */
  onTrigger () {
    const run = async () => {
      const queue = this.queue

      this.queue = new Map()
      this.pending = true

      // Do copying.
      for (const entry of queue.entries()) {
        const sourcePath = entry[0]
        const type = entry[1]

        if (type === 'remove') {
          try {
            await this.remove(sourcePath)
            this.retries.delete(sourcePath)
          } catch (error) {
            const err = /** @type {NodeJS.ErrnoException} */ (error)
            if (err.code === 'EPERM' && this.shouldRetry(sourcePath)) {
              this.onRemoved(sourcePath)
            } else if (err.code !== 'ENOENT') {
              this.onError(error)
            }
          }
        } else {
          try {
            await this.copy(sourcePath)
            this.retries.delete(sourcePath)
          } catch (error) {
            const err = /** @type {NodeJS.ErrnoException} */ (error)
            if (
              (err.code === 'ENOENT' || err.code === 'EPERM') &&
              this.shouldRetry(sourcePath)
            ) {
              if (type === 'add') {
                this.onAdded(sourcePath)
              } else {
                this.onChanged(sourcePath)
              }
            } else {
              this.onError(error)
            }
          }
        }
      }

      this.pending = false
      if (this.queue.size > 0 && this.trigger != null) {
        this.trigger()
      }
    }
    run()
  }

  /**
   * Check whether the given path should be retried.
   * @param {string} sourcePath The path to the target file.
   * @returns {boolean}
   * @private
   */
  shouldRetry (sourcePath) {
    const count = this.retries.get(sourcePath) || 0
    if (count < 10) {
      this.retries.set(sourcePath, 1 + count)
      return true
    }
    this.retries.delete(sourcePath)
    return false
  }

  /**
   * Emit a `watch-ready` event if this is ready and done initial copies.
   * @returns {void}
   * @private
   */
  emitReadyEventIfReady () {
    if (this.ready && this.initialCopyCount === 0) {
      this.emit('watch-ready')
    }
  }

  /**
   * Enqueue the given file to copy it.
   * @param {string} sourcePath The path to the target file.
   * @returns {void}
   * @private
   */
  enqueueAdd (sourcePath) {
    const kind = this.queue.get(sourcePath)

    // null -> add
    // add -> add
    // remove -> change
    // change -> change
    this.queue.set(
      sourcePath,
      kind == null || kind === 'add' ? 'add' : 'change'
    )

    if (this.trigger != null && !this.pending) {
      this.trigger()
    }
  }

  /**
   * Enqueue the given file to remove it.
   * @param {string} sourcePath The path to the target file.
   * @returns {void}
   * @private
   */
  enqueueRemove (sourcePath) {
    const kind = this.queue.get(sourcePath)

    // null -> remove
    // add -> null
    // remove -> remove
    // change -> remove
    if (kind === 'add') {
      this.queue.delete(sourcePath)
    } else {
      this.queue.set(sourcePath, 'remove')
    }

    if (this.trigger != null && !this.pending) {
      this.trigger()
    }
  }

  /**
   * Enqueue the given file to copy it.
   * @param {string} sourcePath The path to the target file.
   * @returns {void}
   * @private
   */
  enqueueChange (sourcePath) {
    const kind = this.queue.get(sourcePath)

    // null -> change
    // add -> add
    // remove -> change
    // change -> change
    this.queue.set(sourcePath, kind === 'add' ? 'add' : 'change')

    if (this.trigger != null && !this.pending) {
      this.trigger()
    }
  }

  /**
   * Copy the given file.
   * @param {string} sourcePath The path to the source file.
   * @returns {Promise<void>}
   * @private
   */
  copy (sourcePath) {
    const run = async () => {
      const outputPath = this.toDestination(sourcePath)
      if (outputPath !== sourcePath) {
        await copyFile(sourcePath, outputPath, this)
        this.emit('copy', {
          srcPath: sourcePath,
          dstPath: outputPath
        })
      }
    }
    return run()
  }

  /**
   * Remove the given file.
   * @param {string} sourcePath The path to the target file.
   * @returns {Promise<void>}
   * @private
   */
  remove (sourcePath) {
    const run = async () => {
      const outputPath = this.toDestination(sourcePath)
      if (outputPath !== sourcePath) {
        await removeFile(outputPath)
        this.emit('remove', { path: outputPath })
      }
    }
    return run()
  }

  /**
   * @override
   * Emit on the next tick.
   * @param {string | symbol} type
   * @param {...unknown} args
   * @returns {boolean}
   */
  emit (type, ...args) {
    process.nextTick(() => {
      super.emit(type, ...args)
    })
    return this.listenerCount(type) > 0
  }
}

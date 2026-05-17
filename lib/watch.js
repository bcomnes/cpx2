/**
 * @author Toru Nagashima <https://github.com/mysticatea>
 * @copyright 2017 Toru Nagashima. All rights reserved.
 * See LICENSE file in root directory for full license.
 */

/**
 * @import { CopyOptions } from './copy.js'
 */

import assert from 'node:assert'
import normalizeOptions from './utils/normalize-options.js'
import applyAction from './utils/apply-action.js'
import removeFile from './utils/remove-file.js'
import Watcher from './utils/watcher.js'

/**
 * Watch files then copy the files on each change.
 * @param {string} source The glob pattern of target files.
 * @param {string} outputDir The output directory.
 * @param {CopyOptions} [options] The options.
 * @returns {Watcher} The watcher object which observes the files.
 */
export default function watch (source, outputDir, options) {
  assert(typeof source === 'string', "'source' should be a string.")
  assert(source.trim().length >= 1, "'source' should not be empty.")
  assert(typeof outputDir === 'string', "'outputDir' should be a string.")
  assert(outputDir.trim().length >= 1, "'outputDir' should not be empty.")
  if (options != null) {
    assert(typeof options === 'object', "'options' should be an object.")
  }

  const opts = normalizeOptions(source, outputDir, /** @type {any} */ (options))

  const watcher = new Watcher(opts)

  async function start () {
    // Clean
    try {
      if (opts.clean) {
        const output = opts.toDestination(opts.source)
        if (output !== opts.source) {
          await applyAction(output, opts, targetPath =>
            removeFile(targetPath)
          )
        }
      }
    } catch (error) {
      watcher.emit('watch-error', error)
      return
    }

    watcher.open()
  }

  start()

  return watcher
}

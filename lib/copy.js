/**
 * @author Toru Nagashima <https://github.com/mysticatea>
 * @copyright 2017 Toru Nagashima. All rights reserved.
 * See LICENSE file in root directory for full license.
 */

/**
 * @import { TransformFactory } from './utils/normalize-options.js'
 */

import assert from 'node:assert'
import normalizeOptions from './utils/normalize-options.js'
import applyAction from './utils/apply-action.js'
import copyFile from './utils/copy-file.js'
import removeFile from './utils/remove-file.js'

/**
 * @typedef {object} CopyOptions
 * @property {boolean} [clean=false] The flag to remove files on the destination before copying.
 * @property {boolean} [dereference=false] The flag to dereference symbolic links.
 * @property {boolean} [includeEmptyDirs=false] The flag to copy empty directories.
 * @property {boolean} [initialCopy=true] The flag to copy files at the first time.
 * @property {boolean} [force=false] The flag to copy file to the destination, even if it is readonly.
 * @property {boolean} [preserve=false] The flag to copy file attributes such as timestamps, users, and groups.
 * @property {TransformFactory | TransformFactory[]} [transform] The factory or array of factories of transform streams.
 * @property {boolean} [update=false] The flag to not overwrite newer files.
 * @property {string | string[]} [ignore] Gitignore string or array of gitignore strings.
 */

/**
 * Copy files asynchronously.
 * @param {string} source The glob pattern of target files.
 * @param {string} outputDir The output directory.
 * @param {CopyOptions | ((err: Error | null, report: object) => void)} [options] The options or callback.
 * @param {(err: Error | null, report: object) => void} [callback] The callback function.
 * @returns {Promise<object>} The promise which will go fulfilled after done.
 */
export default async function copy (source, outputDir, options, callback) {
  if (typeof options === 'function') {
    callback = options
    options = undefined
  }

  assert(typeof source === 'string', "'source' should be a string.")
  assert(source.trim().length >= 1, "'source' should not be empty.")
  assert(typeof outputDir === 'string', "'outputDir' should be a string.")
  assert(outputDir.trim().length >= 1, "'outputDir' should not be empty.")
  if (options != null) {
    assert(typeof options === 'object', "'options' should be an object.")
  }
  if (callback != null) {
    assert(
      typeof callback === 'function',
      "'callback' should be a function."
    )
  }

  const opts = normalizeOptions(source, outputDir, /** @type {any} */ (options))

  // Clean
  /** @type {any[]} */
  let cleaned = []
  if (opts.clean) {
    const output = opts.toDestination(opts.source)
    if (output !== opts.source) {
      cleaned = await applyAction(output, opts, targetPath =>
        removeFile(targetPath)
      )
    }
  }

  // Copy
  const copied = await applyAction(opts.source, opts, sourcePath => {
    const outputPath = opts.toDestination(sourcePath)
    if (outputPath !== sourcePath) {
      return copyFile(sourcePath, outputPath, opts)
    }
    return Promise.resolve(undefined)
  })

  const report = {
    cleaned,
    copied: copied.filter(r => r != null),
    options: opts
  }

  if (callback != null) {
    callback(null, report)
  }

  return report
}

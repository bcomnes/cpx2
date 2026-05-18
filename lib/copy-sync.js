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
import applyActionSync from './utils/apply-action-sync.js'
import copyFileSync from './utils/copy-file-sync.js'
import removeFileSync from './utils/remove-file-sync.js'

/**
 * @typedef {object} CopySyncOptions
 * @property {boolean} [clean=false] The flag to remove files on the destination before copying.
 * @property {boolean} [dereference=false] The flag to dereference symbolic links.
 * @property {boolean} [includeEmptyDirs=false] The flag to copy empty directories.
 * @property {boolean} [initialCopy=true] The flag to copy files at the first time.
 * @property {boolean} [force=false] The flag to copy file to the destination, even if it is readonly.
 * @property {boolean} [preserve=false] The flag to copy file attributes such as timestamps, users, and groups.
 * @property {TransformFactory | TransformFactory[]} [transform] Not supported; checked at runtime and throws.
 * @property {boolean} [update=false] The flag to not overwrite newer files.
 * @property {string | string[]} [ignore] Gitignore string or array of gitignore strings.
 */

/**
 * Copy files synchronously.
 * @param {string} source The glob pattern of target files.
 * @param {string} outputDir The output directory.
 * @param {CopySyncOptions} [options] The options.
 * @returns {object} Report of cleaned and copied files.
 */
export default function copySync (source, outputDir, options) {
  assert(typeof source === 'string', "'source' should be a string.")
  assert(source.trim().length >= 1, "'source' should not be empty.")
  assert(typeof outputDir === 'string', "'outputDir' should be a string.")
  assert(outputDir.trim().length >= 1, "'outputDir' should not be empty.")
  if (typeof options === 'object' && options !== null) {
    assert(
      options.transform === undefined,
      "'options.transform' is not supported in synchronous functions."
    )
  }

  const opts = normalizeOptions(source, outputDir, /** @type {any} */ (options))

  // Clean
  /** @type {any[]} */
  let cleaned = []
  if (opts.clean) {
    const output = opts.toDestination(opts.source)
    if (output !== opts.source) {
      cleaned = applyActionSync(output, opts, targetPath => {
        removeFileSync(targetPath)
      })
    }
  }

  // Copy
  const copied = applyActionSync(opts.source, opts, sourcePath => {
    const outputPath = opts.toDestination(sourcePath)
    if (outputPath !== sourcePath) {
      copyFileSync(sourcePath, outputPath, opts)
    }
  })

  const report = {
    cleaned,
    copied: copied.filter(r => r != null),
    options: opts
  }

  return report
}

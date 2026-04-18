/**
 * @author Toru Nagashima <https://github.com/mysticatea>
 * @copyright 2017 Toru Nagashima. All rights reserved.
 * See LICENSE file in root directory for full license.
 */

// ------------------------------------------------------------------------------
// Requirements
// ------------------------------------------------------------------------------

import path from 'node:path'
import fsPromises from 'node:fs/promises'

// ------------------------------------------------------------------------------
// Exports
// ------------------------------------------------------------------------------

/**
 * Remove a file or a directory asynchronously.
 * Additionally, remove the parent directory if it's empty.
 * @param {string} target The path to the target file.
 * @returns {Promise<void>}
 * @private
 */
export default async function removeFile (target) {
  let report = null
  try {
    const stat = await fsPromises.stat(target)
    if (stat.isDirectory()) {
      await fsPromises.rm(target, { recursive: true, force: true })
    } else {
      await fsPromises.unlink(target)
      report = target
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw err
    }
  }

  // Remove the parent directory if possible.
  try {
    await fsPromises.rmdir(path.dirname(target))
  } catch (err) {
    if (err.code !== 'ENOTEMPTY') {
      throw err
    }
  }

  return report
}

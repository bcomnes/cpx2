/**
 * @author Toru Nagashima <https://github.com/mysticatea>
 * @copyright 2017 Toru Nagashima. All rights reserved.
 * See LICENSE file in root directory for full license.
 */

import path from 'node:path'

/**
 * @overload
 * @param {string} originalPath
 * @returns {string}
 */
/**
 * @overload
 * @param {null | undefined} originalPath
 * @returns {null}
 */
/**
 * Convert the given file path to use forward slashes (glob-compatible).
 * Returns null when given a nullish value.
 *
 * @param {string | null | undefined} originalPath - The path to convert.
 * @returns {string | null} The normalized path, or null if input is nullish.
 * @private
 */
export default function normalizePath (originalPath) {
  if (originalPath == null) {
    return null
  }

  const cwd = process.cwd()
  const relativePath = path.resolve(originalPath)
  const normalizedPath = path.relative(cwd, relativePath).replace(/\\/gu, '/')

  if (normalizedPath.endsWith('/')) {
    return normalizedPath.slice(0, -1)
  }
  return normalizedPath || '.'
}

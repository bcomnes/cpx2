/**
 * @author Toru Nagashima <https://github.com/mysticatea>
 * @copyright 2017 Toru Nagashima. All rights reserved.
 * See LICENSE file in root directory for full license.
 */

// ------------------------------------------------------------------------------
// Requirements
// ------------------------------------------------------------------------------

import { glob } from 'glob'
import ignore from 'ignore'
import pMapPromise from 'p-map'

// ------------------------------------------------------------------------------
// Exports
// ------------------------------------------------------------------------------

/**
 * Apply the given action to every file which matches to the given pattern.
 *
 * @param {string} pattern - The pattern to find files.
 * @param {object} options - The option object.
 * @param {boolean} [options.includeEmptyDirs=false] - The flag to include empty directories to copy.
 * @param {boolean} [options.dereference=false] - The flag to dereference symbolic links.
 * @param {string|Array.<string>} [options.ignore] - gitignore string or array of gitignore strings
 * @param {function(string):void} action - The action function to apply.
 * @returns {Promise<void>} The promise which will go fulfilled after done.
 * @private
 */
export default async function applyAction (pattern, options, action) {
  const ig = ignore({ allowRelativePaths: true }).add(options.ignore ?? [])
  ig.add(options.ignore ?? [])
  const globOptions = {
    nodir: !options.includeEmptyDirs,
    follow: Boolean(options.dereference),
    posix: true,
    ignore: {
      ignored: (p) => {
        try {
          return p.relativePosix() ? ig.ignores(p.relativePosix()) : false
        } catch (err) {
          console.error(err)
        }
      },
      childrenIgnored: (p) => {
        try {
          return p.relativePosix() ? ig.ignores(p.relativePosix()) : false
        } catch (err) {
          console.error(err)
        }
      }
    }
  }
  const sourcePaths = await glob(pattern, globOptions)
  const pMap = (await pMapPromise).default
  return pMap(sourcePaths, action, { concurrency: 5 })
}

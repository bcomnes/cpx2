/**
 * @author Toru Nagashima <https://github.com/mysticatea>
 * @copyright 2017 Toru Nagashima. All rights reserved.
 * See LICENSE file in root directory for full license.
 */

/**
 * @import { NormalizedOptions } from './normalize-options.js'
 * @import { Path } from 'path-scurry'
 */

import { glob } from 'glob'
import ignore from 'ignore'
import pMap from 'p-map'

/**
 * Apply the given action to every file which matches to the given pattern.
 *
 * @template T
 * @param {string} pattern - The pattern to find files.
 * @param {NormalizedOptions} options - The option object.
 * @param {(path: string) => T} action - The action function to apply.
 * @returns {Promise<any[]>} The promise which will go fulfilled after done.
 * @private
 */
export default async function applyAction (pattern, options, action) {
  const ig = ignore({ allowRelativePaths: true }).add(options.ignore ?? [])
  const globOptions = {
    nodir: !options.includeEmptyDirs,
    follow: Boolean(options.dereference),
    posix: true,
    ignore: {
      /**
       * @param {Path} p
       * @returns {boolean}
       */
      ignored (p) {
        try {
          const rp = p.relativePosix()
          return rp ? ig.ignores(rp) : false
        } catch (err) {
          console.error(err)
          return false
        }
      },
      /**
       * @param {Path} p
       * @returns {boolean}
       */
      childrenIgnored (p) {
        try {
          const rp = p.relativePosix()
          return rp ? ig.ignores(rp) : false
        } catch (err) {
          console.error(err)
          return false
        }
      }
    }
  }
  const sourcePaths = await glob(pattern, globOptions)
  return pMap(sourcePaths, action, { concurrency: 5 })
}

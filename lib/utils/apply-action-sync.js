/**
 * @author Toru Nagashima <https://github.com/mysticatea>
 * @copyright 2017 Toru Nagashima. All rights reserved.
 * See LICENSE file in root directory for full license.
 */

/**
 * @import { NormalizedOptions } from './normalize-options.js'
 * @import { Path } from 'path-scurry'
 */

import { globSync } from 'glob'
import ignore from 'ignore'

/**
 * Apply the given action to every file which matches to the given pattern.
 *
 * @template T
 * @param {string} pattern - The pattern to find files.
 * @param {NormalizedOptions} options - The option object.
 * @param {(path: string) => T} action - The action function to apply.
 * @returns {T[]} The results array.
 * @private
 */
export default function applyActionSync (pattern, options, action) {
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
  const results = []
  for (const sourcePath of globSync(pattern, globOptions)) {
    const result = action(sourcePath)
    results.push(result)
  }

  return results
}

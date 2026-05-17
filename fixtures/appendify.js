/**
 * @author Toru Nagashima
 * @copyright 2016 Toru Nagashima. All rights reserved.
 * See LICENSE file in root directory for full license.
 */

// ------------------------------------------------------------------------------
// Requirements
// ------------------------------------------------------------------------------

import { Transform } from 'node:stream'
import isMain from './is-main.js'

// ------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------

const postfix = process.argv[2] || ''

/**
 * Creates a transform stream to append the specific text.
 * @param {string} [_filename] - The filename of the current file.
 * @param {any} [args] - arguments to transform.
 * @returns {Transform} A transform stream to append the specific text.
 */
function append (_filename, args) {
  return new Transform({
    transform (chunk, _encoding, callback) {
      callback(null, chunk)
    },
    flush (callback) {
      const value = (args && args._ && args._[0]) || postfix
      if (value) {
        this.push(value)
      }
      callback()
    }
  })
}

// ------------------------------------------------------------------------------
// Main
// ------------------------------------------------------------------------------

if (isMain(import.meta.url)) {
  process.stdin.pipe(append()).pipe(process.stdout)
}

export default append

/**
 * @author Toru Nagashima
 * @copyright 2016 Toru Nagashima. All rights reserved.
 * See LICENSE file in root directory for full license.
 */

// ------------------------------------------------------------------------------
// Requirements
// ------------------------------------------------------------------------------

import through from 'through'
import isMain from './is-main.js'

// ------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------

/**
 * Creates a transform stream to convert data to upper cases.
 * @returns {stream.Transform} A transform stream to convert data to upper cases.
 */
function toUpperCase () {
  return through(
    /* @this stream.Transform */ function write (chunk) {
      this.queue(chunk.toString().toUpperCase())
    },
    /* @this stream.Transform */ function end () {
      this.queue(null)
    }
  )
}

// ------------------------------------------------------------------------------
// Main
// ------------------------------------------------------------------------------

if (isMain(import.meta.url)) {
  process.stdin.pipe(toUpperCase()).pipe(process.stdout)
}

export default toUpperCase

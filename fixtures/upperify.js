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

/**
 * Creates a transform stream to convert data to upper cases.
 * @returns {Transform} A transform stream to convert data to upper cases.
 */
function toUpperCase () {
  return new Transform({
    transform (chunk, _encoding, callback) {
      callback(null, chunk.toString().toUpperCase())
    }
  })
}

// ------------------------------------------------------------------------------
// Main
// ------------------------------------------------------------------------------

if (isMain(import.meta.url)) {
  process.stdin.pipe(toUpperCase()).pipe(process.stdout)
}

export default toUpperCase

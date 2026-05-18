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

class Upperify extends Transform {
  /**
   * @override
   * @param {Buffer | string} data
   * @param {BufferEncoding} _encoding
   * @param {(err?: Error | null, data?: unknown) => void} callback
   */
  _transform (data, _encoding, callback) {
    callback(null, data.toString().toUpperCase())
  }
}

/**
 * Creates a transform stream to convert data to upper cases.
 * @returns {Transform} A transform stream to convert data to upper cases.
 */
function toUpperCase () {
  return new Upperify()
}

// ------------------------------------------------------------------------------
// Main
// ------------------------------------------------------------------------------

if (isMain(import.meta.url)) {
  process.stdin.pipe(toUpperCase()).pipe(process.stdout)
}

export default toUpperCase

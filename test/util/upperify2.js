/**
 * @author Toru Nagashima
 * @copyright 2016 Toru Nagashima. All rights reserved.
 * See LICENSE file in root directory for full license.
 */

// ------------------------------------------------------------------------------
// Requirements
// ------------------------------------------------------------------------------

import { Transform } from 'node:stream'
import { inherits } from 'node:util'

// ------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------

/**
 * The implementation of the transform stream to convert data to upper case.
 * @constructor
 */
function Upperify () {
  Transform.call(this)
}

inherits(Upperify, Transform)

Object.defineProperties(Upperify.prototype, {
  _transform: {
    value: function _transform (data, _encoding, callback) {
      callback(null, data.toString().toUpperCase())
    },
    configurable: true,
    enumerable: false,
    writable: true
  }
})

/**
 * Creates a transform stream to convert data to upper cases.
 * @returns {stream.Transform} A transform stream to convert data to upper cases.
 */
function toUpperCase () {
  return new Upperify()
}

// ------------------------------------------------------------------------------
// Main
// ------------------------------------------------------------------------------

if (require.main === module) {
  process.stdin.pipe(toUpperCase()).pipe(process.stdout)
} else {
  module.exports = toUpperCase
}

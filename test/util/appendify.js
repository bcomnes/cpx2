/**
 * @author Toru Nagashima
 * @copyright 2016 Toru Nagashima. All rights reserved.
 * See LICENSE file in root directory for full license.
 */
'use strict'

// ------------------------------------------------------------------------------
// Requirements
// ------------------------------------------------------------------------------

const through = require('through')

// ------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------

const postfix = process.argv[2] || ''

/**
 * Creates a transform stream to append the specific text.
 * @param {string} _filename - The filename of the current file.
 * @param {any} args - arguments to transform.
 * @returns {stream.Transform} A transform stream to append the specific text.
 */
function append (_filename, args) {
  return through(
    /* @this stream.Transform */ function write (chunk) {
      this.queue(chunk)
    },
    /* @this stream.Transform */ function end () {
      const value = (args && args._ && args._[0]) || postfix
      if (value) {
        this.queue(value)
      }
      this.queue(null)
    }
  )
}

// ------------------------------------------------------------------------------
// Main
// ------------------------------------------------------------------------------

if (require.main === module) {
  process.stdin.pipe(append()).pipe(process.stdout)
} else {
  module.exports = append
}

/**
 * @author Toru Nagashima <https://github.com/mysticatea>
 * @copyright 2017 Toru Nagashima. All rights reserved.
 * See LICENSE file in root directory for full license.
 */
'use strict'

if (process.argv.some(arg => arg === '-w' || arg === '--watch')) {
  // In order to kill me by test harness.
  process.stdin.setEncoding('utf8')
  process.stdin.on('data', chunk => {
    if (chunk === 'KILL') {
      process.exit(0)
    }
  })
}

// Load the bin file.
require('../../bin/index')

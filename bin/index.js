#!/usr/bin/env node
/**
 * @author Toru Nagashima
 * @copyright 2016 Toru Nagashima. All rights reserved.
 * See LICENSE file in root directory for full license.
 */

// ------------------------------------------------------------------------------
// Requirements
// ------------------------------------------------------------------------------

import subarg from 'subarg'

// ------------------------------------------------------------------------------
// Main
// ------------------------------------------------------------------------------

// Parse arguments.
const unknowns = new Set()
const args = subarg(process.argv.slice(2), {
  alias: {
    c: 'command',
    C: 'clean',
    f: 'force',
    h: 'help',
    includeEmptyDirs: 'include-empty-dirs',
    i: 'ignore',
    L: 'dereference',
    p: 'preserve',
    t: 'transform',
    u: 'update',
    v: 'verbose',
    V: 'version',
    w: 'watch'
  },
  boolean: [
    'clean',
    'dereference',
    'help',
    'force',
    'include-empty-dirs',
    'initial',
    'preserve',
    'update',
    'verbose',
    'version',
    'watch'
  ],
  string: ['ignore'],
  default: { initial: true },
  unknown (arg) {
    if (arg[0] === '-') {
      unknowns.add(arg)
    }
  }
})
const source = args._[0]
const outDir = args._[1]

// Validate Options.
if (unknowns.size > 0) {
  console.error(`Unknown option(s): ${Array.from(unknowns).join(', ')}`)
  process.exitCode = 1
} else if (args.help) { // Main.
  (await import('./help.js')).default()
} else if (args.version) {
  (await import('./version.js')).default()
} else if (source == null || outDir == null || args._.length > 2) {
  (await import('./help.js')).default()
  process.exitCode = 1
} else {
  (await import('./main.js')).default(source, outDir, args)
}

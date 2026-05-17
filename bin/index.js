#!/usr/bin/env node
/**
 * @author Toru Nagashima
 * @copyright 2016 Toru Nagashima. All rights reserved.
 * See LICENSE file in root directory for full license.
 */

/**
 * @import { SubargResult } from 'subarg'
 */

import subarg from 'subarg'

/**
 * Parsed CLI arguments with all known flags declared explicitly.
 * @typedef {object} CpxArgs
 * @property {string[]} _
 * @property {string | string[] | SubargResult | SubargResult[]} [command]
 * @property {string | string[] | SubargResult | SubargResult[]} [transform]
 * @property {boolean} [clean]
 * @property {boolean} [dereference]
 * @property {boolean} [force]
 * @property {boolean} [help]
 * @property {boolean} [include-empty-dirs]
 * @property {boolean} [includeEmptyDirs]
 * @property {string} [ignore]
 * @property {boolean} [initial]
 * @property {boolean} [preserve]
 * @property {boolean} [update]
 * @property {boolean} [verbose]
 * @property {boolean} [version]
 * @property {boolean} [watch]
 */

// Parse arguments.
const unknowns = new Set()
const args = /** @type {CpxArgs} */ (subarg(process.argv.slice(2), {
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
  /**
   * @param {string} arg
   */
  unknown (arg) {
    if (arg[0] === '-') {
      unknowns.add(arg)
    }
  }
}))
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

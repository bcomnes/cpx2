/**
 * @author Toru Nagashima
 * @copyright 2017 Toru Nagashima. All rights reserved.
 * See LICENSE file in root directory for full license.
 */

/**
 * @import { Duplex } from 'node:stream'
 */

import path from 'node:path'
import { Minimatch } from 'minimatch'
import glob2base from 'glob2base'
import normalizePath from './normalize-path.js'

/**
 * Factory function that creates a duplex transform stream for a given source file.
 * @typedef {(source: string, opts?: { outfile?: string }) => Duplex} TransformFactory
 */

/**
 * @typedef {object} NormalizedOptions
 * @property {string} baseDir - Non-magic base directory from the source pattern.
 * @property {boolean} clean
 * @property {boolean} dereference
 * @property {boolean} includeEmptyDirs
 * @property {boolean} initialCopy
 * @property {string} outputDir
 * @property {boolean} force
 * @property {boolean} preserve
 * @property {string} source - Normalized glob pattern.
 * @property {(sourcePath: string) => string} toDestination
 * @property {TransformFactory[]} transform
 * @property {boolean} update
 * @property {string | string[] | undefined} ignore
 */

/**
 * @typedef {object} NormalizeInput
 * @property {boolean} [clean]
 * @property {boolean} [dereference]
 * @property {boolean} [includeEmptyDirs]
 * @property {boolean} [initialCopy]
 * @property {boolean} [force]
 * @property {boolean} [preserve]
 * @property {TransformFactory | TransformFactory[]} [transform]
 * @property {boolean} [update]
 * @property {string | string[]} [ignore]
 */

/**
 * Get non-magic part of the given glob pattern.
 * @param {string} source The glob pattern to get base.
 * @returns {string} The non-magic part.
 * @private
 */
function getBasePath (source) {
  const minimatch = new Minimatch(source)
  return normalizePath(glob2base({ minimatch })) ?? '.'
}

/**
 * Normalize options.
 * @param {string} source The glob pattern of target files.
 * @param {string} outputDir The output directory.
 * @param {NormalizeInput} [options] The options.
 * @returns {NormalizedOptions} The normalized options.
 * @private
 */
export default function normalizeOptions (source, outputDir, options) {
  const normalizedSource = normalizePath(source)
  const baseDir = getBasePath(normalizedSource)
  const normalizedOutputDir = normalizePath(outputDir)
  const toDestination =
    baseDir === '.'
      ? (/** @type {string} */ sourcePath) => path.join(normalizedOutputDir, sourcePath)
      : (/** @type {string} */ sourcePath) => sourcePath.replace(baseDir, normalizedOutputDir)

  return {
    baseDir,
    clean: Boolean(options && options.clean),
    dereference: Boolean(options && options.dereference),
    includeEmptyDirs: Boolean(options && options.includeEmptyDirs),
    initialCopy: (options && options.initialCopy) !== false,
    outputDir,
    force: Boolean(options && options.force),
    preserve: Boolean(options && options.preserve),
    source: normalizedSource,
    toDestination,
    transform: /** @type {TransformFactory[]} */ ([].concat(/** @type {any} */ (options && options.transform)).filter(Boolean)),
    update: Boolean(options && options.update),
    ignore: options && options.ignore
  }
}

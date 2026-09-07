/**
 * @author Toru Nagashima
 * @copyright 2016 Toru Nagashima. All rights reserved.
 * See LICENSE file in root directory for full license.
 */

/**
 * @import { CopyOptions as ImportedCopyOptions } from './copy.js'
 * @import { CopySyncOptions as ImportedCopySyncOptions } from './copy-sync.js'
 * @import { NormalizedOptions as ImportedNormalizedOptions, TransformFactory as ImportedTransformFactory } from './utils/normalize-options.js'
 */

import copy from './copy.js'
import copySync from './copy-sync.js'
import watch from './watch.js'

export {
  copy,
  copySync,
  watch
}

/**
 * @typedef {ImportedCopyOptions} CopyOptions
 * @typedef {ImportedCopySyncOptions} CopySyncOptions
 * @typedef {ImportedNormalizedOptions} NormalizedOptions
 * @typedef {ImportedTransformFactory} TransformFactory
 */

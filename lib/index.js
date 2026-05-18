/**
 * @author Toru Nagashima
 * @copyright 2016 Toru Nagashima. All rights reserved.
 * See LICENSE file in root directory for full license.
 */

/**
 * @import { CopyOptions } from './copy.js'
 * @import { CopySyncOptions } from './copy-sync.js'
 * @import { NormalizedOptions, TransformFactory } from './utils/normalize-options.js'
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
 * @typedef {CopyOptions} CopyOptions
 * @typedef {CopySyncOptions} CopySyncOptions
 * @typedef {NormalizedOptions} NormalizedOptions
 * @typedef {TransformFactory} TransformFactory
 */

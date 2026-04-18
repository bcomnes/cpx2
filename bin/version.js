/* eslint-disable */
/**
 * @author Toru Nagashima
 * @copyright 2016 Toru Nagashima. All rights reserved.
 * See LICENSE file in root directory for full license.
 */

// ------------------------------------------------------------------------------
// Exports
// ------------------------------------------------------------------------------

import pkg from '../package.json' with { type: 'json' }

/**
 * Prints the version text.
 *
 * @returns {void}
 */
export default function version () {
  console.log(`v${pkg.version}`)
}

/**
 * @author Toru Nagashima
 * @copyright 2016 Toru Nagashima. All rights reserved.
 * See LICENSE file in root directory for full license.
 */

import { createRequire } from 'node:module'

const pkg = /** @type {{ version: string }} */ (createRequire(import.meta.url)('../package.json'))

/**
 * Prints the version text.
 *
 * @returns {void}
 */
export default function version () {
  console.log(`v${pkg.version}`)
}

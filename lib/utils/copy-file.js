/**
 * @author Toru Nagashima
 * @copyright 2016 Toru Nagashima. All rights reserved.
 * See LICENSE file in root directory for full license.
 */

/**
 * @import { NormalizedOptions, TransformFactory } from './normalize-options.js'

 */

import path from 'node:path'
import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import { pipeline } from 'node:stream/promises'

/**
 * @typedef {{ source: string, output: string, skipped: boolean }} CopyResult
 */

/**
 * Copy the content of the given file using optional transform streams.
 * @param {string} source - A path of the source file.
 * @param {string} output - A path of the destination file.
 * @param {TransformFactory[]} transforms - Factory functions for transform streams.
 * @returns {Promise<void>}
 * @private
 */
async function copyFileContent (source, output, transforms) {
  /** @type {ReturnType<TransformFactory>[]} */
  const stages = []
  try {
    for (const factory of transforms) stages.push(factory(source, { outfile: output }))
  } catch (error) {
    for (const stage of stages) stage.destroy()
    throw error
  }

  const reader = fs.createReadStream(source)
  const writer = fs.createWriteStream(output)
  const closed = new Promise(resolve => writer.once('close', resolve))
  try {
    await pipeline([reader, ...stages, writer])
  } finally {
    writer.destroy()
    await closed
  }
}

/**
 * Copy a file asynchronously, optionally applying transform streams and preserving attributes.
 * @param {string} source - A path of the source file.
 * @param {string} output - A path of the destination file.
 * @param {Pick<NormalizedOptions, 'transform' | 'preserve' | 'update' | 'force'>} options - Options.
 * @returns {Promise<CopyResult>}
 * @private
 */
export default async function copyFile (source, output, options) {
  const stat = await fsPromises.stat(source)

  if (options.update) {
    try {
      const dstStat = await fsPromises.stat(output)
      if (dstStat.mtime.getTime() > stat.mtime.getTime()) {
        return { source, output, skipped: true }
      }
    } catch (dstStatError) {
      if (/** @type {NodeJS.ErrnoException} */ (dstStatError).code !== 'ENOENT') {
        throw dstStatError
      }
    }
  }

  if (stat.isDirectory()) {
    await fsPromises.mkdir(output, { recursive: true })
  } else {
    await fsPromises.mkdir(path.dirname(output), { recursive: true })

    if (!(stat.mode & 0o200) && options.force) {
      try {
        await fsPromises.chmod(output, stat.mode | 0o200)
      } catch (dstChmodError) {
        if (/** @type {NodeJS.ErrnoException} */ (dstChmodError).code !== 'ENOENT') {
          throw dstChmodError
        }
      }
    }
    await copyFileContent(source, output, options.transform)
  }
  await fsPromises.chmod(output, stat.mode)

  if (options.preserve) {
    await fsPromises.chown(output, stat.uid, stat.gid)
    await fsPromises.utimes(output, stat.atime, stat.mtime)
  }

  return { source, output, skipped: false }
}

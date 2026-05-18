/**
 * @author Toru Nagashima
 * @copyright 2016 Toru Nagashima. All rights reserved.
 * See LICENSE file in root directory for full license.
 */

/**
 * @import { NormalizedOptions, TransformFactory } from './normalize-options.js'
 * @import { Readable } from 'node:stream'
 */

import path from 'node:path'
import fs from 'node:fs'
import fsPromises from 'node:fs/promises'

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
function copyFileContent (source, output, transforms) {
  return new Promise((resolve, reject) => {
    const reader = fs.createReadStream(source)
    const writer = fs.createWriteStream(output)
    /** @type {Array<Readable | ReturnType<TransformFactory>>} */
    const streams = [reader]

    /**
     * @param {unknown} err
     * @returns {void}
     */
    function cleanup (err) {
      try {
        for (const s of streams) {
          s.removeListener('error', cleanup)
          if (typeof s.destroy === 'function') {
            s.destroy()
          }
        }
        writer.removeListener('error', cleanup)
        writer.removeListener('finish', resolve)
      } catch {
        reject(err)
        return
      }

      reject(err)
    }

    reader.on('error', cleanup)
    writer.on('error', cleanup)
    writer.on('finish', resolve)

    try {
      /** @type {Readable} */
      const piped = transforms.reduce(
        /**
         * @param {Readable} input
         * @param {TransformFactory} factory
         * @returns {Readable}
         */
        (input, factory) => {
          const t = factory(source, { outfile: output })
          t.on('error', cleanup)
          streams.push(t)
          return input.pipe(t)
        },
        /** @type {Readable} */ (reader)
      )
      piped.pipe(writer)
    } catch (err) {
      cleanup(err)
    }
  })
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

/**
 * @author Toru Nagashima
 * @copyright 2016 Toru Nagashima. All rights reserved.
 * See LICENSE file in root directory for full license.
 */

import path from 'node:path'
import fs from 'node:fs'
import fsPromises from 'node:fs/promises'

/**
 * Copy the content of the given file.
 * Transform the content by 'transform' option.
 * @param {string} source - A path of the source file.
 * @param {string} output - A path of the destination file.
 * @param {function[]} transforms - Factory functions for transform streams.
 * @returns {Promise<void>} The promise which will go fulfilled after done.
 * @private
 */
function copyFileContent (source, output, transforms) {
  return new Promise((resolve, reject) => {
    const reader = fs.createReadStream(source)
    const writer = fs.createWriteStream(output)
    const streams = [reader]

    /**
         * Clean up.
         * @param {Error} err - An error or undefined.
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
      transforms
        .reduce((input, factory) => {
          const t = factory(source, { outfile: output })
          t.on('error', cleanup)
          streams.push(t)

          return input.pipe(t)
        }, reader)
        .pipe(writer)
    } catch (err) {
      cleanup(err)
    }
  })
}

/**
 * Copy a file asynchronously.
 * Additionally, copy file attributes also by options.
 * @function
 * @param {string} source - A path of the source file.
 * @param {string} output - A path of the destination file.
 * @param {object} options - Options.
 * @param {function[]} options.transform - Factory functions for transform streams.
 * @param {boolean} options.preserve - The flag to copy attributes.
 * @param {boolean} options.update - The flag to disallow overwriting.
 * @returns {Promise<object>} The promise which will go fulfilled after done.
 * @private
 */
export default async function copyFile (source, output, options) {
  const stat = await fsPromises.stat(source)

  if (options.update) {
    try {
      const dstStat = await fsPromises.stat(output)
      if (dstStat.mtime.getTime() > stat.mtime.getTime()) {
        // Don't overwrite because the file on destination is newer than
        // the source file.
        return { source, output, skipped: true }
      }
    } catch (dstStatError) {
      if (dstStatError.code !== 'ENOENT') {
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
        if (dstChmodError.code !== 'ENOENT') {
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

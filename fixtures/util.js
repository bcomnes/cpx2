/**
 * @author Toru Nagashima
 * @copyright 2016 Toru Nagashima. All rights reserved.
 * See LICENSE file in root directory for full license.
 */

// ------------------------------------------------------------------------------
// Requirements
// ------------------------------------------------------------------------------

import assert from 'node:assert'
import { exec, execSync } from 'node:child_process'
import { dirname } from 'node:path'
import fs from 'node:fs'
import fsPromises from 'node:fs/promises'

// ------------------------------------------------------------------------------
// Public Interface
// ------------------------------------------------------------------------------

/**
 * Wait for the given duration.
 *
 * @param {number} ms The duration in milliseconds to wait.
 * @returns {Promise<void>} The promise which will go fulfilled after the duration.
 */
export function delay (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Writes specific data to a specific file.
 *
 * @param {string} path - A path to write.
 * @param {string} contentText - A text to write.
 * @returns {Promise<void>} The promise which will go fulfilled after done.
 */
export async function writeFile (
  path,
  contentText
) {
  await fsPromises.mkdir(dirname(path), { recursive: true })
  await fsPromises.writeFile(path, contentText)
}

/**
 * Removes a specific file.
 *
 * @param {string} path - A path to write.
 * @returns {Promise<void>} The promise which will go fulfilled after done.
 */
export function removeFile (path) {
  return fsPromises.rm(path, { recursive: true, force: true })
}

/**
 * Gets the content of a specific file.
 *
 * @param {string} path - A path to read.
 * @returns {Promise<string|null>} The content of the file, or `null` if not found.
 */
export function readFile (path) {
  return fsPromises.readFile(path, { encoding: 'utf8' }).catch(() => null)
}

/**
 * Sets up test files.
 *
 * @param {Record<string, string | null>} dataset - Test data to write.
 * @returns {Promise<void>} The promise which will go fulfilled after done.
 */
export function setupTestDir (dataset) {
  return Promise.all(
    Object.keys(dataset).map(path =>
      dataset[path] == null
        ? fs.mkdirSync(path, { recursive: true })
        : writeFile(path, /** @type {string} */ (dataset[path]))
    )
  ).then(() => delay(250))
}

/**
 * Removes test data.
 *
 * @param {string} testRootPath - A path to write.
 * @returns {Promise<void>} The promise which will go fulfilled after done.
 */
export function teardownTestDir (testRootPath) {
  return fsPromises.rm(testRootPath, { recursive: true, force: true })
}

/**
 * Verifies test files match expected content.
 *
 * @param {Record<string, string | null>} dataset - Test data to verify.
 * @returns {Promise<void>} The promise which will go fulfilled after done.
 */
export async function verifyTestDir (dataset) {
  for (const path of Object.keys(dataset)) {
    const content = await readFile(path)
    assert.strictEqual(content, dataset[path])
  }
}

/**
 * Execute cpx command.
 * @param {string} args - Command arguments.
 * @returns {import('node:child_process').ChildProcess} A child process object.
 */
export function execCommand (args) {
  return exec(`node fixtures/bin.js ${args}`)
}

/**
 * @typedef {{ code: number, stdout: string, stderr: string }} CommandResult
 */

/**
 * Execute cpx command synchronously.
 * @param {string} args - Command arguments.
 * @returns {CommandResult}
 */
export function execCommandSync (args) {
  try {
    const stdout = execSync(`node fixtures/bin.js ${args}`, { encoding: 'utf8', stdio: 'pipe' })
    return { code: 0, stdout, stderr: '' }
  } catch (err) {
    const error = /** @type {NodeJS.ErrnoException & { status?: number, stdout?: unknown, stderr?: unknown }} */ (err)
    return {
      code: error.status ?? 1,
      stdout: error.stdout != null ? String(error.stdout) : '',
      stderr: error.stderr != null ? String(error.stderr) : '',
    }
  }
}

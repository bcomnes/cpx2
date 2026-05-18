/**
 * @author Toru Nagashima
 * @copyright 2016 Toru Nagashima. All rights reserved.
 * See LICENSE file in root directory for full license.
 */

// ------------------------------------------------------------------------------
// Requirements
// ------------------------------------------------------------------------------

import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'
import path from 'node:path'
import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import * as cpx from '#lib'
import { setupTestDir, teardownTestDir, verifyTestDir, execCommandSync } from '#fixtures/util.js'
import upperify from '#fixtures/upperify.js'
import upperify2 from '#fixtures/upperify2.js'

/**
 * @param {string} source
 * @param {string} outDir
 * @param {import('#lib').CopyOptions} [options]
 * @returns {Promise<void>}
 */
function copyWithCallback (source, outDir, options) {
  return new Promise((resolve, reject) => {
    cpx.copy(source, outDir, options ?? {}, error => {
      if (error) {
        reject(error)
        return
      }
      resolve()
    }).catch(reject)
  })
}

// ------------------------------------------------------------------------------
// Test
// ------------------------------------------------------------------------------

describe('The copy method', { concurrency: false }, function () {
  describe('should copy specified files with globs:', function () {
    beforeEach(function () {
      return setupTestDir({
        'test-ws/untouchable.txt': 'untouchable',
        'test-ws/a/hello.txt': 'Hello',
        'test-ws/a/b/this-is.txt': 'A pen',
        'test-ws/a/b/that-is.txt': 'A note',
        'test-ws/a/b/no-copy.dat': 'no-copy'
      })
    }
    )

    afterEach(function () { return teardownTestDir('test-ws') })

    /**
         * Verify.
         * @returns {Promise<void>}
         */
    function verifyFiles () {
      return verifyTestDir({
        'test-ws/untouchable.txt': 'untouchable',
        'test-ws/a/hello.txt': 'Hello',
        'test-ws/a/b/this-is.txt': 'A pen',
        'test-ws/a/b/that-is.txt': 'A note',
        'test-ws/a/b/no-copy.dat': 'no-copy',
        'test-ws/b/untouchable.txt': null,
        'test-ws/b/hello.txt': 'Hello',
        'test-ws/b/b/this-is.txt': 'A pen',
        'test-ws/b/b/that-is.txt': 'A note',
        'test-ws/b/b/no-copy.dat': null
      })
    }

    test('lib async version.', async function () {
      await copyWithCallback('test-ws/a/**/*.txt', 'test-ws/b')
      await verifyFiles()
    })

    test('lib async version (promise).', function () { return cpx.copy('test-ws/a/**/*.txt', 'test-ws/b').then(verifyFiles) })

    test('lib sync version.', function () {
      cpx.copySync('test-ws/a/**/*.txt', 'test-ws/b')
      return verifyFiles()
    })

    test('command version.', function () {
      execCommandSync('"test-ws/a/**/*.txt" test-ws/b')
      return verifyFiles()
    })
  })

  describe('should copy specified files with globs and ignore strings:', function () {
    beforeEach(function () {
      return setupTestDir({
        'test-ws/untouchable.txt': 'untouchable',
        'test-ws/a/hello.txt': 'Hello',
        'test-ws/a/b/this-is.txt': 'A pen',
        'test-ws/a/b/that-is.txt': 'A note',
        'test-ws/a/b/no-copy.dat': 'no-copy',
        'test-ws/a/node_modules/no-copy.txt': 'no-copy',
        'test-ws/a/vscode/no-copy.txt': 'no-copy'
      })
    }
    )

    afterEach(function () { return teardownTestDir('test-ws') })

    /**
         * Verify.
         * @returns {Promise<void>}
         */
    function verifyFiles () {
      return verifyTestDir({
        'test-ws/untouchable.txt': 'untouchable',
        'test-ws/a/hello.txt': 'Hello',
        'test-ws/a/b/this-is.txt': 'A pen',
        'test-ws/a/b/that-is.txt': 'A note',
        'test-ws/a/b/no-copy.dat': 'no-copy',
        'test-ws/a/node_modules/no-copy.txt': 'no-copy',
        'test-ws/a/vscode/no-copy.txt': 'no-copy',
        'test-ws/b/untouchable.txt': null,
        'test-ws/b/hello.txt': 'Hello',
        'test-ws/b/b/this-is.txt': 'A pen',
        'test-ws/b/b/that-is.txt': 'A note',
        'test-ws/b/b/no-copy.dat': null,
        'test-ws/b/vscode/no-copy.txt': null
      })
    }

    const ignore = ['node_modules', 'vscode']

    test('lib async version.', async function () {
      await copyWithCallback('test-ws/a/**/*.txt', 'test-ws/b', { ignore })
      await verifyFiles()
    })

    test('lib async version (promise).', function () {
      return cpx
        .copy('test-ws/a/**/*.txt', 'test-ws/b', {
          ignore
        })
        .then(verifyFiles)
    })

    test('lib sync version.', function () {
      cpx.copySync('test-ws/a/**/*.txt', 'test-ws/b', {
        ignore
      })
      return verifyFiles()
    })

    test('command version.', function () {
      execCommandSync(
                `"test-ws/a/**/*.txt" test-ws/b --ignore ${ignore.join(',')}`
      )
      return verifyFiles()
    })
  })

  describe('should clean and copy specified files with globs when give clean option:', function () {
    beforeEach(function () {
      return setupTestDir({
        'test-ws/untouchable.txt': 'untouchable',
        'test-ws/a/hello.txt': 'Hello',
        'test-ws/a/b/this-is.txt': 'A pen',
        'test-ws/a/b/that-is.txt': 'A note',
        'test-ws/a/b/no-copy.dat': 'no-copy',
        'test-ws/b/b/remove.txt': 'remove',
        'test-ws/b/b/no-remove.dat': 'no-remove'
      })
    }
    )

    afterEach(function () { return teardownTestDir('test-ws') })

    /**
         * Verify.
         * @returns {Promise<void>}
         */
    function verifyFiles () {
      return verifyTestDir({
        'test-ws/untouchable.txt': 'untouchable',
        'test-ws/a/hello.txt': 'Hello',
        'test-ws/a/b/this-is.txt': 'A pen',
        'test-ws/a/b/that-is.txt': 'A note',
        'test-ws/a/b/no-copy.dat': 'no-copy',
        'test-ws/b/untouchable.txt': null,
        'test-ws/b/hello.txt': 'Hello',
        'test-ws/b/b/this-is.txt': 'A pen',
        'test-ws/b/b/that-is.txt': 'A note',
        'test-ws/b/b/no-copy.dat': null,
        'test-ws/b/b/remove.txt': null,
        'test-ws/b/b/no-remove.dat': 'no-remove'
      })
    }

    test('lib async version.', async function () {
      await copyWithCallback('test-ws/a/**/*.txt', 'test-ws/b', { clean: true })
      await verifyFiles()
    })

    test('lib sync version.', function () {
      cpx.copySync('test-ws/a/**/*.txt', 'test-ws/b', { clean: true })
      return verifyFiles()
    })

    test('command version.', function () {
      execCommandSync('"test-ws/a/**/*.txt" test-ws/b --clean')
      return verifyFiles()
    })
  })

  describe('should copy files inside of symlink directory when `--dereference` option was specified:', function () {
    beforeEach(async function () {
      await setupTestDir({
        'test-ws/src/a/hello.txt': 'Symlinked',
        'test-ws/a/hello.txt': 'Hello'
      })
      await fsPromises.symlink(
        path.resolve('test-ws/src'),
        path.resolve('test-ws/a/link'),
        'junction'
      )
    })

    afterEach(function () { return teardownTestDir('test-ws') })

    /**
         * Verify.
         * @returns {Promise<void>}
         */
    function verifyFiles () {
      return verifyTestDir({
        'test-ws/a/hello.txt': 'Hello',
        'test-ws/a/link/a/hello.txt': 'Symlinked',
        'test-ws/b/hello.txt': 'Hello',
        'test-ws/b/link/a/hello.txt': 'Symlinked'
      })
    }

    test('lib async version.', async function () {
      await copyWithCallback(
        'test-ws/a/**/*.txt',
        'test-ws/b',
        { dereference: true })
      await verifyFiles()
    })

    test('lib sync version.', function () {
      cpx.copySync('test-ws/a/**/*.txt', 'test-ws/b', {
        dereference: true
      })
      return verifyFiles()
    })

    test('command version.', function () {
      execCommandSync('"test-ws/a/**/*.txt" test-ws/b --dereference')
      return verifyFiles()
    })
  })

  describe('should not copy files inside of symlink directory when `--dereference` option was not specified:', function () {
    beforeEach(async function () {
      await setupTestDir({
        'test-ws/src/a/hello.txt': 'Symlinked',
        'test-ws/a/hello.txt': 'Hello'
      })
      await fsPromises.symlink(
        path.resolve('test-ws/src'),
        path.resolve('test-ws/a/link'),
        'junction'
      )
    })

    afterEach(function () { return teardownTestDir('test-ws') })

    /**
         * Verify.
         * @returns {Promise<void>}
         */
    function verifyFiles () {
      return verifyTestDir({
        'test-ws/a/hello.txt': 'Hello',
        'test-ws/a/link/a/hello.txt': 'Symlinked',
        'test-ws/b/hello.txt': 'Hello',
        'test-ws/b/link/a/hello.txt': null
      })
    }

    test('lib async version.', async function () {
      await copyWithCallback('test-ws/a/**/*.txt', 'test-ws/b', {})
      await verifyFiles()
    })

    test('lib sync version.', function () {
      cpx.copySync('test-ws/a/**/*.txt', 'test-ws/b', {})
      return verifyFiles()
    })

    test('command version.', function () {
      execCommandSync('"test-ws/a/**/*.txt" test-ws/b')
      return verifyFiles()
    })
  })

  describe('should copy specified empty directories with globs when `--include-empty-dirs` option was given:', function () {
    beforeEach(function () {
      return setupTestDir({
        'test-ws/a/hello.txt': 'Hello',
        'test-ws/a/b/pen.txt': 'A pen',
        'test-ws/a/c': null
      })
    }
    )

    afterEach(function () { return teardownTestDir('test-ws') })

    /**
         * Verify.
         * @returns {Promise<void>}
         */
    function verifyFiles () {
      async function run () {
        await verifyTestDir({
          'test-ws/a/hello.txt': 'Hello',
          'test-ws/a/b/pen.txt': 'A pen',
          'test-ws/b/hello.txt': 'Hello',
          'test-ws/b/b/pen.txt': 'A pen'
        })
        assert(fs.statSync('test-ws/a/c').isDirectory())
        assert(fs.statSync('test-ws/b/c').isDirectory())
      }

      return run()
    }

    test('lib async version.', async function () {
      await copyWithCallback(
        'test-ws/a/**',
        'test-ws/b',
        { includeEmptyDirs: true })
      await verifyFiles()
    })

    test('lib sync version.', function () {
      cpx.copySync('test-ws/a/**', 'test-ws/b', {
        includeEmptyDirs: true
      })
      return verifyFiles()
    })

    test('command version.', function () {
      execCommandSync('"test-ws/a/**" test-ws/b --include-empty-dirs')
      return verifyFiles()
    })
  })

  describe('should not copy specified empty directories with globs when `--include-empty-dirs` option was not given:', function () {
    beforeEach(function () {
      return setupTestDir({
        'test-ws/a/hello.txt': 'Hello',
        'test-ws/a/b/pen.txt': 'A pen',
        'test-ws/a/c': null
      })
    }
    )

    afterEach(function () { return teardownTestDir('test-ws') })

    /**
         * Verify.
         * @returns {Promise<void>}
         */
    function verifyFiles () {
      async function run () {
        await verifyTestDir({
          'test-ws/a/hello.txt': 'Hello',
          'test-ws/a/b/pen.txt': 'A pen',
          'test-ws/b/hello.txt': 'Hello',
          'test-ws/b/b/pen.txt': 'A pen'
        })
        assert(fs.statSync('test-ws/a/c').isDirectory())
        assert.throws(() => fs.statSync('test-ws/b/c'), /ENOENT/u)
      }

      return run()
    }

    test('lib async version.', async function () {
      await copyWithCallback('test-ws/a/**', 'test-ws/b')
      await verifyFiles()
    })

    test('lib sync version.', function () {
      cpx.copySync('test-ws/a/**', 'test-ws/b')
      return verifyFiles()
    })

    test('command version.', function () {
      execCommandSync('"test-ws/a/**" test-ws/b')
      return verifyFiles()
    })
  })

  describe('should copy specified files with globs when `--preserve` option was given:', function () {
    beforeEach(function () {
      return setupTestDir({
        'test-ws/untouchable.txt': 'untouchable',
        'test-ws/a/hello.txt': 'Hello',
        'test-ws/a/b/this-is.txt': 'A pen',
        'test-ws/a/b/that-is.txt': 'A note',
        'test-ws/a/b/no-copy.dat': 'no-copy'
      })
    }
    )

    afterEach(function () { return teardownTestDir('test-ws') })

    /**
         * Verify.
         * @returns {Promise<void>}
         */
    function verifyFiles () {
      return verifyTestDir({
        'test-ws/untouchable.txt': 'untouchable',
        'test-ws/a/hello.txt': 'Hello',
        'test-ws/a/b/this-is.txt': 'A pen',
        'test-ws/a/b/that-is.txt': 'A note',
        'test-ws/a/b/no-copy.dat': 'no-copy',
        'test-ws/b/untouchable.txt': null,
        'test-ws/b/hello.txt': 'Hello',
        'test-ws/b/b/this-is.txt': 'A pen',
        'test-ws/b/b/that-is.txt': 'A note',
        'test-ws/b/b/no-copy.dat': null
      })
    }

    test('lib async version.', async function () {
      await copyWithCallback(
        'test-ws/a/**/*.txt',
        'test-ws/b',
        { preserve: true })
      await verifyFiles()
    })

    test('lib sync version.', function () {
      cpx.copySync('test-ws/a/**/*.txt', 'test-ws/b', { preserve: true })
      return verifyFiles()
    })

    test('command version.', function () {
      execCommandSync('"test-ws/a/**/*.txt" test-ws/b --preserve')
      return verifyFiles()
    })
  })

  describe('should copy attributes when `--preserve` option was given:', function () {
    afterEach(function () { return teardownTestDir('test-ws') })

    /**
         * Verify.
         * @returns {Promise<void>}
         */
    function verifyFiles () {
      async function run () {
        const srcStat = await fsPromises.stat('./LICENSE')
        const dstStat = await fsPromises.stat('./test-ws/LICENSE')
        const srcMtime = Math.floor(srcStat.mtime.getTime() / 1000)
        const dstMtime = Math.floor(dstStat.mtime.getTime() / 1000)

        assert(srcStat.uid === dstStat.uid)
        assert(srcStat.gid === dstStat.gid)
        assert(srcMtime === dstMtime)
      }

      return run()
    }

    test('lib async version.', async function () {
      await copyWithCallback('LICENSE', 'test-ws', { preserve: true })
      await verifyFiles()
    })

    test('lib sync version.', function () {
      cpx.copySync('LICENSE', 'test-ws', { preserve: true })
      return verifyFiles()
    })

    test('command version.', function () {
      execCommandSync('LICENSE test-ws --preserve')
      return verifyFiles()
    })
  })

  describe('should not copy specified files if the source file is older than the destination file, when `--update` option was given:', function () {
    beforeEach(async function () {
      await setupTestDir({
        'test-ws/a.txt': 'newer source',
        'test-ws/b.txt': 'older source',
        'test-ws/a/a.txt': 'older destination',
        'test-ws/a/b.txt': 'newer destination'
      })

      const older = Date.now() / 1000
      const newer = older + 1
      await fsPromises.utimes('test-ws/a.txt', newer, newer)
      await fsPromises.utimes('test-ws/b.txt', older, older)
      await fsPromises.utimes('test-ws/a/a.txt', older, older)
      await fsPromises.utimes('test-ws/a/b.txt', newer, newer)
    })

    afterEach(function () { return teardownTestDir('test-ws') })

    /**
         * Verify.
         * @returns {Promise<void>}
         */
    function verifyFiles () {
      return verifyTestDir({
        'test-ws/a.txt': 'newer source',
        'test-ws/b.txt': 'older source',
        'test-ws/a/a.txt': 'newer source',
        'test-ws/a/b.txt': 'newer destination'
      })
    }

    test('lib async version.', async function () {
      await copyWithCallback('test-ws/*.txt', 'test-ws/a', { update: true })
      await verifyFiles()
    })

    test('lib sync version.', function () {
      cpx.copySync('test-ws/*.txt', 'test-ws/a', { update: true })
      return verifyFiles()
    })

    test('command version.', function () {
      execCommandSync('"test-ws/*.txt" test-ws/a --update')
      return verifyFiles()
    })
  })

  describe('should copy specified files when `--update` option was not given:', function () {
    beforeEach(async function () {
      await setupTestDir({
        'test-ws/a.txt': 'newer source',
        'test-ws/b.txt': 'older source',
        'test-ws/a/a.txt': 'older destination',
        'test-ws/a/b.txt': 'newer destination'
      })

      const older = Date.now() / 1000
      const newer = older + 1
      await fsPromises.utimes('test-ws/a.txt', newer, newer)
      await fsPromises.utimes('test-ws/b.txt', older, older)
      await fsPromises.utimes('test-ws/a/a.txt', older, older)
      await fsPromises.utimes('test-ws/a/b.txt', newer, newer)
    })

    afterEach(function () { return teardownTestDir('test-ws') })

    /**
         * Verify.
         * @returns {Promise<void>}
         */
    function verifyFiles () {
      return verifyTestDir({
        'test-ws/a.txt': 'newer source',
        'test-ws/b.txt': 'older source',
        'test-ws/a/a.txt': 'newer source',
        'test-ws/a/b.txt': 'older source'
      })
    }

    test('lib async version.', async function () {
      await copyWithCallback('test-ws/*.txt', 'test-ws/a')
      await verifyFiles()
    })

    test('lib sync version.', function () {
      cpx.copySync('test-ws/*.txt', 'test-ws/a')
      return verifyFiles()
    })

    test('command version.', function () {
      execCommandSync('"test-ws/*.txt" test-ws/a')
      return verifyFiles()
    })
  })

  describe('should copy with transforming when `--command` option was specified.', function () {
    beforeEach(function () { return setupTestDir({ 'test-ws/a/hello.txt': 'Hello' }) })

    afterEach(function () { return teardownTestDir('test-ws') })

    /**
         * Verify.
         * @returns {Promise<void>}
         */
    function verifyFiles () {
      return verifyTestDir({ 'test-ws/b/hello.txt': 'HELLO' })
    }

    test('command version.', function () {
      execCommandSync(
        '"test-ws/a/**/*.txt" test-ws/b --command "node ./fixtures/upperify.js"'
      )
      return verifyFiles()
    })
  })

  describe("should copy with transforming when `--command` option was specified (it does not have 'destroy' method).", function () {
    beforeEach(function () { return setupTestDir({ 'test-ws/a/hello.txt': 'Hello' }) })

    afterEach(function () { return teardownTestDir('test-ws') })

    /**
         * Verify.
         * @returns {Promise<void>}
         */
    function verifyFiles () {
      return verifyTestDir({ 'test-ws/b/hello.txt': 'HELLO' })
    }

    test('command version.', function () {
      execCommandSync(
        '"test-ws/a/**/*.txt" test-ws/b --command "node ./fixtures/upperify2.js"'
      )
      return verifyFiles()
    })
  })

  describe('should copy with transforming when `--transform` option was specified.', function () {
    beforeEach(function () { return setupTestDir({ 'test-ws/a/hello.txt': 'Hello' }) })

    afterEach(function () { return teardownTestDir('test-ws') })

    /**
         * Verify.
         * @returns {Promise<void>}
         */
    function verifyFiles () {
      return verifyTestDir({ 'test-ws/b/hello.txt': 'HELLO' })
    }

    test('lib async version.', async function () {
      await copyWithCallback(
        'test-ws/a/**/*.txt',
        'test-ws/b',
        { transform: /** @type {any} */ (upperify) })
      await verifyFiles()
    })

    test('should throw an error on lib sync version (cannot use streaming api).', function () {
      assert.throws(() => {
        cpx.copySync('test-ws/a/**/*.txt', 'test-ws/b', {
          transform: /** @type {any} */ (upperify)
        })
      }, Error)
    })

    test('command version.', function () {
      execCommandSync(
        '"test-ws/a/**/*.txt" test-ws/b --transform ./fixtures/upperify'
      )
      return verifyFiles()
    })
  })

  describe("should copy with transforming when `--transform` option was specified (it does not have 'destroy' method).", function () {
    beforeEach(function () { return setupTestDir({ 'test-ws/a/hello.txt': 'Hello' }) })

    afterEach(function () { return teardownTestDir('test-ws') })

    /**
         * Verify.
         * @returns {Promise<void>}
         */
    function verifyFiles () {
      return verifyTestDir({ 'test-ws/b/hello.txt': 'HELLO' })
    }

    test('lib async version.', async function () {
      await copyWithCallback(
        'test-ws/a/**/*.txt',
        'test-ws/b',
        { transform: /** @type {any} */ (upperify2) })
      await verifyFiles()
    })

    test('should throw an error on lib sync version (cannot use streaming api).', function () {
      assert.throws(() => {
        cpx.copySync('test-ws/a/**/*.txt', 'test-ws/b', {
          transform: /** @type {any} */ (upperify2)
        })
      }, Error)
    })

    test('command version.', function () {
      execCommandSync(
        '"test-ws/a/**/*.txt" test-ws/b --transform ./fixtures/upperify2'
      )
      return verifyFiles()
    })
  })

  describe('should keep order when a mix of -c and -t was specified.', function () {
    beforeEach(function () { return setupTestDir({ 'test-ws/a/hello.txt': 'Hello' }) })

    afterEach(function () { return teardownTestDir('test-ws') })

    /**
         * Verify.
         * @returns {Promise<void>}
         */
    function verifyFiles () {
      return verifyTestDir({ 'test-ws/b/hello.txt': 'Helloabcd' })
    }

    test('command version.', function () {
      execCommandSync(
        '"test-ws/a/**/*.txt" test-ws/b -c "node ./fixtures/appendify.js a" -t [./fixtures/appendify b] -c "node ./fixtures/appendify.js c" -t [./fixtures/appendify d]'
      )
      return verifyFiles()
    })
  })

  describe("should copy as expected even if a specific path didn't include `/`.", function () {
    beforeEach(function () { return setupTestDir({ 'hello.txt': 'Hello' }) })

    afterEach(async function () {
      await teardownTestDir('hello.txt')
      await teardownTestDir('test-ws')
    })

    /**
         * Verify.
         * @returns {Promise<void>}
         */
    function verifyFiles () {
      return verifyTestDir({ 'test-ws/hello.txt': 'Hello' })
    }

    test('lib async version.', async function () {
      await copyWithCallback('hello.txt', 'test-ws')
      await verifyFiles()
    })

    test('lib sync version.', function () {
      cpx.copySync('hello.txt', 'test-ws')
      return verifyFiles()
    })

    test('command version.', function () {
      execCommandSync('hello.txt test-ws')
      return verifyFiles()
    })
  })

  describe('should copy specified files with globs even if there are parentheses:', function () {
    beforeEach(function () { return setupTestDir({ 'test-ws/a(paren)/hello.txt': 'Hello' }) }
    )

    afterEach(function () { return teardownTestDir('test-ws') })

    /**
         * Verify.
         * @returns {Promise<void>}
         */
    function verifyFiles () {
      return verifyTestDir({
        'test-ws/a(paren)/hello.txt': 'Hello',
        'test-ws/b/hello.txt': 'Hello'
      })
    }

    test('lib async version.', async function () {
      await copyWithCallback('test-ws/a(paren)/**/*.txt', 'test-ws/b')
      await verifyFiles()
    })

    test('lib sync version.', function () {
      cpx.copySync('test-ws/a(paren)/**/*.txt', 'test-ws/b')
      return verifyFiles()
    })

    test('command version.', function () {
      execCommandSync('"test-ws/a(paren)/**/*.txt" test-ws/b')
      return verifyFiles()
    })
  })
})

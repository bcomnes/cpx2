import assert from 'node:assert/strict'
import fs from 'node:fs'
import { afterEach, beforeEach, describe, test } from 'node:test'
import * as cpx from '#lib'
import { setupTestDir, teardownTestDir } from '#fixtures/util.js'

describe('destination names that look like replacement patterns', { concurrency: false }, function () {
  beforeEach(function () {
    return setupTestDir({
      'test-ws/src/hello.txt': 'Hello',
      'test-ws/out/$cache/stale.txt': 'stale',
      'test-ws/out/$$cache/keep.txt': 'keep'
    })
  })

  afterEach(function () { return teardownTestDir('test-ws') })

  test('copies into a directory whose name contains $$', function () {
    cpx.copySync('test-ws/src/**/*.txt', 'test-ws/out/$$cache')

    assert.equal(fs.readFileSync('test-ws/out/$$cache/hello.txt', 'utf8'), 'Hello')
    assert.equal(fs.existsSync('test-ws/out/$cache/hello.txt'), false)
  })

  test('cleans the named directory, not the $-expanded one', function () {
    cpx.copySync('test-ws/src/**/*.txt', 'test-ws/out/$$cache', { clean: true })

    assert.equal(fs.existsSync('test-ws/out/$$cache/keep.txt'), false)
    assert.equal(fs.readFileSync('test-ws/out/$$cache/hello.txt', 'utf8'), 'Hello')
    assert.equal(fs.readFileSync('test-ws/out/$cache/stale.txt', 'utf8'), 'stale')
  })

  test('copies into a directory whose name contains $&', function () {
    cpx.copySync('test-ws/src/**/*.txt', 'test-ws/out/$&bag')

    assert.equal(fs.readFileSync('test-ws/out/$&bag/hello.txt', 'utf8'), 'Hello')
  })
})

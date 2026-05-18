/**
 * @author Toru Nagashima
 * @copyright 2016 Toru Nagashima. All rights reserved.
 * See LICENSE file in root directory for full license.
 */

/**
 * @import { CpxArgs } from './index.js'
 * @import { TransformFactory } from '../lib/utils/normalize-options.js'
 * @import { SubargResult } from 'subarg'
 */

import { resolve as resolvePath } from 'node:path'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { parse as parseShellQuote } from 'shell-quote'
import { Duplex } from 'node:stream'
import applyAction from '../lib/utils/apply-action.js'
import applyActionSync from '../lib/utils/apply-action-sync.js'
import copyFile from '../lib/utils/copy-file.js'
import normalizeOptions from '../lib/utils/normalize-options.js'
import removeFileSync from '../lib/utils/remove-file-sync.js'
import Watcher from '../lib/utils/watcher.js'

const require = createRequire(import.meta.url)

const ABS_OR_REL = /^[./]/u
const C_OR_COMMAND = /^(?:-c|--command)$/u
const T_OR_TRANSFORM = /^(?:-t|--transform)$/u

/**
 * @param {string} source
 * @param {string} outDir
 * @param {CpxArgs} args
 * @returns {void}
 */
export default function main (source, outDir, args) {
  // Resolve Command.
  /** @type {TransformFactory[]} */
  const commands = []
    .concat(/** @type {any} */ (args.command))
    .filter(Boolean)
    .map(/** @param {string | SubargResult} command */ command => {
      if (typeof command !== 'string') {
        console.error('Invalid --command option')
        process.exit(1)
      }

      /** @type {TransformFactory} */
      return file => {
        const env = Object.create(process.env, {
          FILE: { value: file }
        })
        const parts = parseShellQuote(command, env)
        const child = spawn(
          /** @type {string} */ (parts[0]),
          /** @type {string[]} */ (parts.slice(1)),
          { env }
        )
        const outer = Duplex.from(/** @type {any} */ ({ readable: child.stdout, writable: child.stdin }))
        child.on('exit', code => {
          if (code !== 0) {
            const error = new Error(`non-zero exit code in command: ${command}`)
            outer.emit('error', error)
          }
        })
        child.stderr?.pipe(process.stderr)

        return outer
      }
    })

  // Resolve Transforms.
  /** @type {Array<{ name: string, argv: SubargResult | null }>} */
  const transforms = []
    .concat(/** @type {any} */ (args.transform))
    .filter(Boolean)
    .map(/** @param {string | SubargResult} arg @returns {{ name: string, argv: SubargResult | null } | undefined} */ arg => { // eslint-disable-line array-callback-return
      if (typeof arg === 'string') {
        return { name: arg, argv: null }
      }
      const sub = /** @type {SubargResult} */ (arg)
      if (typeof sub._[0] === 'string') {
        return { name: /** @type {string} */ (sub._.shift()), argv: sub }
      }

      console.error('Invalid --transform option')
      process.exit(1)
    })
    .filter(x => x != null)

  /** @type {TransformFactory[]} */
  const transformFactories = transforms.map(item => {
    const modulePath = ABS_OR_REL.test(item.name)
      ? resolvePath(item.name)
      : require.resolve(item.name, { paths: [process.cwd()] })

    const m = require(modulePath)
    const createStream = m?.default ?? m

    /** @type {TransformFactory} */
    return (file, opts) =>
      createStream(file, Object.assign({ _flags: opts }, item.argv))
  })

  // Merge commands and transforms in the same order as process.argv.
  /** @type {TransformFactory[]} */
  const mergedTransformFactories = process.argv
    .map(part => {
      if (C_OR_COMMAND.test(part)) {
        return commands.shift() ?? null
      }
      if (T_OR_TRANSFORM.test(part)) {
        return transformFactories.shift() ?? null
      }
      return null
    })
    .filter(x => x != null)

  // Main.
  const log = args.verbose
    ? console.log.bind(console)
    : () => { /* do nothing */ }

  const opts = normalizeOptions(source, outDir, /** @type {any} */ ({
    transform: mergedTransformFactories,
    dereference: args.dereference,
    includeEmptyDirs: args['include-empty-dirs'],
    initialCopy: args.initial,
    force: args.force,
    preserve: args.preserve,
    update: args.update,
    ignore: args.ignore ? args.ignore.split(',') : undefined
  }))

  if (args.clean) {
    const output = opts.toDestination(opts.source)
    if (output !== opts.source) {
      log()
      log(`Clean: ${output}`)
      log()
      try {
        applyActionSync(output, opts, targetPath => {
          removeFileSync(targetPath)
          log(`Removed: ${targetPath}`)
        })
      } catch (err) {
        console.error(`Failed to clean: ${/** @type {Error} */ (err).message}.`)
        process.exit(1)
      }
    }
  }

  if (args.watch) {
    if (opts.initialCopy) {
      log()
      log(`Copy: ${source} --> ${outDir}`)
      log()
    }

    new Watcher(opts)
      .on('copy', event => {
        log(`Copied: ${event.srcPath} --> ${event.dstPath}`)
      })
      .on('remove', event => {
        log(`Removed: ${event.path}`)
      })
      .on('watch-ready', () => {
        log()
        log(`Be watching ${opts.source}`)
        log()
      })
      .on('watch-error', err => {
        console.error(/** @type {Error} */ (err).message)
      })
      .open()
  } else {
    log()
    log(`Copy: ${source} --> ${outDir}`)
    log()

    applyAction(opts.source, opts, sourcePath => {
      const outputPath = opts.toDestination(sourcePath)
      if (outputPath !== sourcePath) {
        return copyFile(sourcePath, outputPath, opts).then(() => {
          log(`Copied: ${sourcePath} --> ${outputPath}`)
        })
      }
      return Promise.resolve()
    }).catch(error => {
      console.error(error)
      console.error(`Failed to copy: ${/** @type {Error} */ (error).message}.`)
      process.exit(1)
    })
  }
}

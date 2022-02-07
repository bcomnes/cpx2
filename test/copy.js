/**
 * @author Toru Nagashima
 * @copyright 2016 Toru Nagashima. All rights reserved.
 * See LICENSE file in root directory for full license.
 */
"use strict"

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const assert = require("assert")
const path = require("path")
const fs = require("fs-extra")
const cpx = require("..")
const util = require("./util/util")
const setupTestDir = util.setupTestDir
const teardownTestDir = util.teardownTestDir
const verifyTestDir = util.verifyTestDir
const execCommandSync = util.execCommandSync
const upperify = require("./util/upperify")
const upperify2 = require("./util/upperify2")

//------------------------------------------------------------------------------
// Test
//------------------------------------------------------------------------------

describe("The copy method", () => {
    describe("should copy specified files with globs:", () => {
        beforeEach(() =>
            setupTestDir({
                "test-ws/untouchable.txt": "untouchable",
                "test-ws/a/hello.txt": "Hello",
                "test-ws/a/b/this-is.txt": "A pen",
                "test-ws/a/b/that-is.txt": "A note",
                "test-ws/a/b/no-copy.dat": "no-copy",
            })
        )
        afterEach(() => teardownTestDir("test-ws"))

        /**
         * Verify.
         * @returns {void}
         */
        function verifyFiles() {
            return verifyTestDir({
                "test-ws/untouchable.txt": "untouchable",
                "test-ws/a/hello.txt": "Hello",
                "test-ws/a/b/this-is.txt": "A pen",
                "test-ws/a/b/that-is.txt": "A note",
                "test-ws/a/b/no-copy.dat": "no-copy",
                "test-ws/b/untouchable.txt": null,
                "test-ws/b/hello.txt": "Hello",
                "test-ws/b/b/this-is.txt": "A pen",
                "test-ws/b/b/that-is.txt": "A note",
                "test-ws/b/b/no-copy.dat": null,
            })
        }

        it("lib async version.", done => {
            cpx.copy("test-ws/a/**/*.txt", "test-ws/b", () =>
                verifyFiles().then(() => done(), done)
            )
        })

        it("lib async version (promise).", () =>
            cpx.copy("test-ws/a/**/*.txt", "test-ws/b").then(verifyFiles))

        it("lib sync version.", () => {
            cpx.copySync("test-ws/a/**/*.txt", "test-ws/b")
            return verifyFiles()
        })

        it("command version.", () => {
            execCommandSync('"test-ws/a/**/*.txt" test-ws/b')
            return verifyFiles()
        })
    })

    describe("should copy specified files with globs and ignore strings:", () => {
        beforeEach(() =>
            setupTestDir({
                "test-ws/untouchable.txt": "untouchable",
                "test-ws/a/hello.txt": "Hello",
                "test-ws/a/b/this-is.txt": "A pen",
                "test-ws/a/b/that-is.txt": "A note",
                "test-ws/a/b/no-copy.dat": "no-copy",
                "test-ws/a/node_modules/no-copy.txt": "no-copy",
                "test-ws/a/vscode/no-copy.txt": "no-copy",
            })
        )
        afterEach(() => teardownTestDir("test-ws"))

        /**
         * Verify.
         * @returns {void}
         */
        function verifyFiles() {
            return verifyTestDir({
                "test-ws/untouchable.txt": "untouchable",
                "test-ws/a/hello.txt": "Hello",
                "test-ws/a/b/this-is.txt": "A pen",
                "test-ws/a/b/that-is.txt": "A note",
                "test-ws/a/b/no-copy.dat": "no-copy",
                "test-ws/a/node_modules/no-copy.txt": "no-copy",
                "test-ws/a/vscode/no-copy.txt": "no-copy",
                "test-ws/b/untouchable.txt": null,
                "test-ws/b/hello.txt": "Hello",
                "test-ws/b/b/this-is.txt": "A pen",
                "test-ws/b/b/that-is.txt": "A note",
                "test-ws/b/b/no-copy.dat": null,
                "test-ws/b/vscode/no-copy.txt": null,
            })
        }

        const ignore = ["node_modules", "vscode"]

        it("lib async version.", done => {
            cpx.copy("test-ws/a/**/*.txt", "test-ws/b", { ignore }, () =>
                verifyFiles().then(() => done(), done)
            )
        })

        it("lib async version (promise).", () =>
            cpx
                .copy("test-ws/a/**/*.txt", "test-ws/b", {
                    ignore,
                })
                .then(verifyFiles))

        it("lib sync version.", () => {
            cpx.copySync("test-ws/a/**/*.txt", "test-ws/b", {
                ignore,
            })
            return verifyFiles()
        })

        it("command version.", () => {
            execCommandSync(
                `"test-ws/a/**/*.txt" test-ws/b --ignore ${ignore.join(",")}`
            )
            return verifyFiles()
        })
    })

    describe.only("should copy specified files with globs that include ignore directives:", () => {
        beforeEach(() =>
            setupTestDir({
                "test-ws/node_modules/hi.png": "no-copy",
                "test-ws/node_modules/foo/bar.png": "no-copy",
                "test-ws/static/hi.jpg": "hi.jpg contents",
                "test-ws/static/foo/bar.jpg": "bar.jpg contents",
            })
        )
        //  afterEach(() => teardownTestDir("test-ws"))

        /**
         * Verify.
         * @returns {void}
         */
        function verifyFiles() {
            return verifyTestDir({
                "test-ws/node_modules/hi.png": "no-copy",
                "test-ws/node_modules/foo/bar.png": "no-copy",
                "test-ws/static/hi.jpg": "hi.jpg contents",
                "test-ws/static/foo/bar.jpg": "bar.jpg contents",
                "test-ws/public/static/hi.jpg": "hi.jpg contents",
                "test-ws/public/static/foo/bar.jpg": "bar.jpg contents",
                "test-ws/public/node_modules/hi.png": null,
                "test-ws/public/node_modules/foo/bar.png": null,
            })
        }

        it("lib async version.", done => {
            cpx.copy("test-ws/!(node_modules)**/*.{png,jpg}", "public", () =>
                verifyFiles().then(() => done(), done)
            )
        })

        it("lib async version (promise).", () =>
            cpx
                .copy("test-ws/!(node_modules)**/*.{png,jpg}", "public")
                .then(verifyFiles))

        it("lib sync version.", () => {
            cpx.copySync("test-ws/!(node_modules)**/*.{png,jpg}", "public")
            return verifyFiles()
        })

        it("command version.", () => {
            execCommandSync('"test-ws/!(node_modules)**/*.{png,jpg}" public')
            return verifyFiles()
        })
    })

    describe("should clean and copy specified files with globs when give clean option:", () => {
        beforeEach(() =>
            setupTestDir({
                "test-ws/untouchable.txt": "untouchable",
                "test-ws/a/hello.txt": "Hello",
                "test-ws/a/b/this-is.txt": "A pen",
                "test-ws/a/b/that-is.txt": "A note",
                "test-ws/a/b/no-copy.dat": "no-copy",
                "test-ws/b/b/remove.txt": "remove",
                "test-ws/b/b/no-remove.dat": "no-remove",
            })
        )
        afterEach(() => teardownTestDir("test-ws"))

        /**
         * Verify.
         * @returns {void}
         */
        function verifyFiles() {
            return verifyTestDir({
                "test-ws/untouchable.txt": "untouchable",
                "test-ws/a/hello.txt": "Hello",
                "test-ws/a/b/this-is.txt": "A pen",
                "test-ws/a/b/that-is.txt": "A note",
                "test-ws/a/b/no-copy.dat": "no-copy",
                "test-ws/b/untouchable.txt": null,
                "test-ws/b/hello.txt": "Hello",
                "test-ws/b/b/this-is.txt": "A pen",
                "test-ws/b/b/that-is.txt": "A note",
                "test-ws/b/b/no-copy.dat": null,
                "test-ws/b/b/remove.txt": null,
                "test-ws/b/b/no-remove.dat": "no-remove",
            })
        }

        it("lib async version.", done => {
            cpx.copy("test-ws/a/**/*.txt", "test-ws/b", { clean: true }, () =>
                verifyFiles().then(() => done(), done)
            )
        })

        it("lib sync version.", () => {
            cpx.copySync("test-ws/a/**/*.txt", "test-ws/b", { clean: true })
            return verifyFiles()
        })

        it("command version.", () => {
            execCommandSync('"test-ws/a/**/*.txt" test-ws/b --clean')
            return verifyFiles()
        })
    })

    describe("should copy files inside of symlink directory when `--dereference` option was specified:", () => {
        beforeEach(async () => {
            await setupTestDir({
                "test-ws/src/a/hello.txt": "Symlinked",
                "test-ws/a/hello.txt": "Hello",
            })
            await fs.symlink(
                path.resolve("test-ws/src"),
                path.resolve("test-ws/a/link"),
                "junction"
            )
        })
        afterEach(() => teardownTestDir("test-ws"))

        /**
         * Verify.
         * @returns {void}
         */
        function verifyFiles() {
            return verifyTestDir({
                "test-ws/a/hello.txt": "Hello",
                "test-ws/a/link/a/hello.txt": "Symlinked",
                "test-ws/b/hello.txt": "Hello",
                "test-ws/b/link/a/hello.txt": "Symlinked",
            })
        }

        it("lib async version.", done => {
            cpx.copy(
                "test-ws/a/**/*.txt",
                "test-ws/b",
                { dereference: true },
                () => verifyFiles().then(() => done(), done)
            )
        })

        it("lib sync version.", () => {
            cpx.copySync("test-ws/a/**/*.txt", "test-ws/b", {
                dereference: true,
            })
            return verifyFiles()
        })

        it("command version.", () => {
            execCommandSync('"test-ws/a/**/*.txt" test-ws/b --dereference')
            return verifyFiles()
        })
    })

    describe("should not copy files inside of symlink directory when `--dereference` option was not specified:", () => {
        beforeEach(async () => {
            await setupTestDir({
                "test-ws/src/a/hello.txt": "Symlinked",
                "test-ws/a/hello.txt": "Hello",
            })
            await fs.symlink(
                path.resolve("test-ws/src"),
                path.resolve("test-ws/a/link"),
                "junction"
            )
        })
        afterEach(() => teardownTestDir("test-ws"))

        /**
         * Verify.
         * @returns {void}
         */
        function verifyFiles() {
            return verifyTestDir({
                "test-ws/a/hello.txt": "Hello",
                "test-ws/a/link/a/hello.txt": "Symlinked",
                "test-ws/b/hello.txt": "Hello",
                "test-ws/b/link/a/hello.txt": null,
            })
        }

        it("lib async version.", done => {
            cpx.copy("test-ws/a/**/*.txt", "test-ws/b", {}, () =>
                verifyFiles().then(() => done(), done)
            )
        })

        it("lib sync version.", () => {
            cpx.copySync("test-ws/a/**/*.txt", "test-ws/b", {})
            return verifyFiles()
        })

        it("command version.", () => {
            execCommandSync('"test-ws/a/**/*.txt" test-ws/b')
            return verifyFiles()
        })
    })

    describe("should copy specified empty directories with globs when `--include-empty-dirs` option was given:", () => {
        beforeEach(() =>
            setupTestDir({
                "test-ws/a/hello.txt": "Hello",
                "test-ws/a/b/pen.txt": "A pen",
                "test-ws/a/c": null,
            })
        )
        afterEach(() => teardownTestDir("test-ws"))

        /**
         * Verify.
         * @returns {void}
         */
        function verifyFiles() {
            async function run() {
                await verifyTestDir({
                    "test-ws/a/hello.txt": "Hello",
                    "test-ws/a/b/pen.txt": "A pen",
                    "test-ws/b/hello.txt": "Hello",
                    "test-ws/b/b/pen.txt": "A pen",
                })
                assert(fs.statSync("test-ws/a/c").isDirectory())
                assert(fs.statSync("test-ws/b/c").isDirectory())
            }

            return run()
        }

        it("lib async version.", done => {
            cpx.copy(
                "test-ws/a/**",
                "test-ws/b",
                { includeEmptyDirs: true },
                () => verifyFiles().then(() => done(), done)
            )
        })

        it("lib sync version.", () => {
            cpx.copySync("test-ws/a/**", "test-ws/b", {
                includeEmptyDirs: true,
            })
            return verifyFiles()
        })

        it("command version.", () => {
            execCommandSync('"test-ws/a/**" test-ws/b --include-empty-dirs')
            return verifyFiles()
        })
    })

    describe("should not copy specified empty directories with globs when `--include-empty-dirs` option was not given:", () => {
        beforeEach(() =>
            setupTestDir({
                "test-ws/a/hello.txt": "Hello",
                "test-ws/a/b/pen.txt": "A pen",
                "test-ws/a/c": null,
            })
        )
        afterEach(() => teardownTestDir("test-ws"))

        /**
         * Verify.
         * @returns {void}
         */
        function verifyFiles() {
            async function run() {
                await verifyTestDir({
                    "test-ws/a/hello.txt": "Hello",
                    "test-ws/a/b/pen.txt": "A pen",
                    "test-ws/b/hello.txt": "Hello",
                    "test-ws/b/b/pen.txt": "A pen",
                })
                assert(fs.statSync("test-ws/a/c").isDirectory())
                assert.throws(() => fs.statSync("test-ws/b/c"), /ENOENT/u)
            }

            return run()
        }

        it("lib async version.", done => {
            cpx.copy("test-ws/a/**", "test-ws/b", () =>
                verifyFiles().then(() => done(), done)
            )
        })

        it("lib sync version.", () => {
            cpx.copySync("test-ws/a/**", "test-ws/b")
            return verifyFiles()
        })

        it("command version.", () => {
            execCommandSync('"test-ws/a/**" test-ws/b')
            return verifyFiles()
        })
    })

    describe("should copy specified files with globs when `--preserve` option was given:", () => {
        beforeEach(() =>
            setupTestDir({
                "test-ws/untouchable.txt": "untouchable",
                "test-ws/a/hello.txt": "Hello",
                "test-ws/a/b/this-is.txt": "A pen",
                "test-ws/a/b/that-is.txt": "A note",
                "test-ws/a/b/no-copy.dat": "no-copy",
            })
        )
        afterEach(() => teardownTestDir("test-ws"))

        /**
         * Verify.
         * @returns {void}
         */
        function verifyFiles() {
            return verifyTestDir({
                "test-ws/untouchable.txt": "untouchable",
                "test-ws/a/hello.txt": "Hello",
                "test-ws/a/b/this-is.txt": "A pen",
                "test-ws/a/b/that-is.txt": "A note",
                "test-ws/a/b/no-copy.dat": "no-copy",
                "test-ws/b/untouchable.txt": null,
                "test-ws/b/hello.txt": "Hello",
                "test-ws/b/b/this-is.txt": "A pen",
                "test-ws/b/b/that-is.txt": "A note",
                "test-ws/b/b/no-copy.dat": null,
            })
        }

        it("lib async version.", done => {
            cpx.copy(
                "test-ws/a/**/*.txt",
                "test-ws/b",
                { preserve: true },
                () => verifyFiles().then(() => done(), done)
            )
        })

        it("lib sync version.", () => {
            cpx.copySync("test-ws/a/**/*.txt", "test-ws/b", { preserve: true })
            return verifyFiles()
        })

        it("command version.", () => {
            execCommandSync('"test-ws/a/**/*.txt" test-ws/b --preserve')
            return verifyFiles()
        })
    })

    describe("should copy attributes when `--preserve` option was given:", () => {
        afterEach(() => teardownTestDir("test-ws"))

        /**
         * Verify.
         * @returns {void}
         */
        function verifyFiles() {
            async function run() {
                const srcStat = await fs.stat("./LICENSE")
                const dstStat = await fs.stat("./test-ws/LICENSE")
                const srcMtime = Math.floor(srcStat.mtime.getTime() / 1000)
                const dstMtime = Math.floor(dstStat.mtime.getTime() / 1000)

                assert(srcStat.uid === dstStat.uid)
                assert(srcStat.gid === dstStat.gid)
                assert(srcMtime === dstMtime)
            }

            return run()
        }

        it("lib async version.", done => {
            cpx.copy("LICENSE", "test-ws", { preserve: true }, () =>
                verifyFiles().then(() => done(), done)
            )
        })

        it("lib sync version.", () => {
            cpx.copySync("LICENSE", "test-ws", { preserve: true })
            return verifyFiles()
        })

        it("command version.", () => {
            execCommandSync("LICENSE test-ws --preserve")
            return verifyFiles()
        })
    })

    describe("should not copy specified files if the source file is older than the destination file, when `--update` option was given:", () => {
        beforeEach(async () => {
            await setupTestDir({
                "test-ws/a.txt": "newer source",
                "test-ws/b.txt": "older source",
                "test-ws/a/a.txt": "older destination",
                "test-ws/a/b.txt": "newer destination",
            })

            const older = Date.now() / 1000
            const newer = older + 1
            await fs.utimes("test-ws/a.txt", newer, newer)
            await fs.utimes("test-ws/b.txt", older, older)
            await fs.utimes("test-ws/a/a.txt", older, older)
            await fs.utimes("test-ws/a/b.txt", newer, newer)
        })
        afterEach(() => teardownTestDir("test-ws"))

        /**
         * Verify.
         * @returns {void}
         */
        function verifyFiles() {
            return verifyTestDir({
                "test-ws/a.txt": "newer source",
                "test-ws/b.txt": "older source",
                "test-ws/a/a.txt": "newer source",
                "test-ws/a/b.txt": "newer destination",
            })
        }

        it("lib async version.", done => {
            cpx.copy("test-ws/*.txt", "test-ws/a", { update: true }, () =>
                verifyFiles().then(() => done(), done)
            )
        })

        it("lib sync version.", () => {
            cpx.copySync("test-ws/*.txt", "test-ws/a", { update: true })
            return verifyFiles()
        })

        it("command version.", () => {
            execCommandSync('"test-ws/*.txt" test-ws/a --update')
            return verifyFiles()
        })
    })

    describe("should copy specified files when `--update` option was not given:", () => {
        beforeEach(async () => {
            await setupTestDir({
                "test-ws/a.txt": "newer source",
                "test-ws/b.txt": "older source",
                "test-ws/a/a.txt": "older destination",
                "test-ws/a/b.txt": "newer destination",
            })

            const older = Date.now() / 1000
            const newer = older + 1
            await fs.utimes("test-ws/a.txt", newer, newer)
            await fs.utimes("test-ws/b.txt", older, older)
            await fs.utimes("test-ws/a/a.txt", older, older)
            await fs.utimes("test-ws/a/b.txt", newer, newer)
        })
        afterEach(() => teardownTestDir("test-ws"))

        /**
         * Verify.
         * @returns {void}
         */
        function verifyFiles() {
            return verifyTestDir({
                "test-ws/a.txt": "newer source",
                "test-ws/b.txt": "older source",
                "test-ws/a/a.txt": "newer source",
                "test-ws/a/b.txt": "older source",
            })
        }

        it("lib async version.", done => {
            cpx.copy("test-ws/*.txt", "test-ws/a", () =>
                verifyFiles().then(() => done(), done)
            )
        })

        it("lib sync version.", () => {
            cpx.copySync("test-ws/*.txt", "test-ws/a")
            return verifyFiles()
        })

        it("command version.", () => {
            execCommandSync('"test-ws/*.txt" test-ws/a')
            return verifyFiles()
        })
    })

    describe("should copy with transforming when `--command` option was specified.", () => {
        beforeEach(() => setupTestDir({ "test-ws/a/hello.txt": "Hello" }))
        afterEach(() => teardownTestDir("test-ws"))

        /**
         * Verify.
         * @returns {void}
         */
        function verifyFiles() {
            return verifyTestDir({ "test-ws/b/hello.txt": "HELLO" })
        }

        it("command version.", () => {
            execCommandSync(
                '"test-ws/a/**/*.txt" test-ws/b --command "node ./test/util/upperify.js"'
            )
            return verifyFiles()
        })
    })

    describe("should copy with transforming when `--command` option was specified (it does not have 'destroy' method).", () => {
        beforeEach(() => setupTestDir({ "test-ws/a/hello.txt": "Hello" }))
        afterEach(() => teardownTestDir("test-ws"))

        /**
         * Verify.
         * @returns {void}
         */
        function verifyFiles() {
            return verifyTestDir({ "test-ws/b/hello.txt": "HELLO" })
        }

        it("command version.", () => {
            execCommandSync(
                '"test-ws/a/**/*.txt" test-ws/b --command "node ./test/util/upperify2.js"'
            )
            return verifyFiles()
        })
    })

    describe("should copy with transforming when `--transform` option was specified.", () => {
        beforeEach(() => setupTestDir({ "test-ws/a/hello.txt": "Hello" }))
        afterEach(() => teardownTestDir("test-ws"))

        /**
         * Verify.
         * @returns {void}
         */
        function verifyFiles() {
            return verifyTestDir({ "test-ws/b/hello.txt": "HELLO" })
        }

        it("lib async version.", done => {
            cpx.copy(
                "test-ws/a/**/*.txt",
                "test-ws/b",
                { transform: upperify },
                () => verifyFiles().then(() => done(), done)
            )
        })

        it("should throw an error on lib sync version (cannot use streaming api).", () => {
            assert.throws(() => {
                cpx.copySync("test-ws/a/**/*.txt", "test-ws/b", {
                    transform: upperify,
                })
            }, Error)
        })

        it("command version.", () => {
            execCommandSync(
                '"test-ws/a/**/*.txt" test-ws/b --transform ./test/util/upperify'
            )
            return verifyFiles()
        })
    })

    describe("should copy with transforming when `--transform` option was specified (it does not have 'destroy' method).", () => {
        beforeEach(() => setupTestDir({ "test-ws/a/hello.txt": "Hello" }))
        afterEach(() => teardownTestDir("test-ws"))

        /**
         * Verify.
         * @returns {void}
         */
        function verifyFiles() {
            return verifyTestDir({ "test-ws/b/hello.txt": "HELLO" })
        }

        it("lib async version.", done => {
            cpx.copy(
                "test-ws/a/**/*.txt",
                "test-ws/b",
                { transform: upperify2 },
                () => verifyFiles().then(() => done(), done)
            )
        })

        it("should throw an error on lib sync version (cannot use streaming api).", () => {
            assert.throws(() => {
                cpx.copySync("test-ws/a/**/*.txt", "test-ws/b", {
                    transform: upperify2,
                })
            }, Error)
        })

        it("command version.", () => {
            execCommandSync(
                '"test-ws/a/**/*.txt" test-ws/b --transform ./test/util/upperify2'
            )
            return verifyFiles()
        })
    })

    describe("should keep order when a mix of -c and -t was specified.", () => {
        beforeEach(() => setupTestDir({ "test-ws/a/hello.txt": "Hello" }))
        afterEach(() => teardownTestDir("test-ws"))

        /**
         * Verify.
         * @returns {void}
         */
        function verifyFiles() {
            return verifyTestDir({ "test-ws/b/hello.txt": "Helloabcd" })
        }

        it("command version.", () => {
            execCommandSync(
                '"test-ws/a/**/*.txt" test-ws/b -c "node ./test/util/appendify.js a" -t [./test/util/appendify b] -c "node ./test/util/appendify.js c" -t [./test/util/appendify d]'
            )
            return verifyFiles()
        })
    })

    describe("should copy as expected even if a specific path didn't include `/`.", () => {
        beforeEach(() => setupTestDir({ "hello.txt": "Hello" }))
        afterEach(async () => {
            await teardownTestDir("hello.txt")
            await teardownTestDir("test-ws")
        })

        /**
         * Verify.
         * @returns {void}
         */
        function verifyFiles() {
            return verifyTestDir({ "test-ws/hello.txt": "Hello" })
        }

        it("lib async version.", done => {
            cpx.copy("hello.txt", "test-ws", () =>
                verifyFiles().then(() => done(), done)
            )
        })

        it("lib sync version.", () => {
            cpx.copySync("hello.txt", "test-ws")
            return verifyFiles()
        })

        it("command version.", () => {
            execCommandSync("hello.txt test-ws")
            return verifyFiles()
        })
    })

    describe("should copy specified files with globs even if there are parentheses:", () => {
        beforeEach(() =>
            setupTestDir({ "test-ws/a(paren)/hello.txt": "Hello" })
        )
        afterEach(() => teardownTestDir("test-ws"))

        /**
         * Verify.
         * @returns {void}
         */
        function verifyFiles() {
            return verifyTestDir({
                "test-ws/a(paren)/hello.txt": "Hello",
                "test-ws/b/hello.txt": "Hello",
            })
        }

        it("lib async version.", done => {
            cpx.copy("test-ws/a(paren)/**/*.txt", "test-ws/b", () =>
                verifyFiles().then(() => done(), done)
            )
        })

        it("lib sync version.", () => {
            cpx.copySync("test-ws/a(paren)/**/*.txt", "test-ws/b")
            return verifyFiles()
        })

        it("command version.", () => {
            execCommandSync('"test-ws/a(paren)/**/*.txt" test-ws/b')
            return verifyFiles()
        })
    })
})

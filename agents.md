# Agent Guidelines

- Write Markdown prose with one sentence per line. Use one newline between sentences to keep them in the same paragraph; two newlines create a new paragraph.
- Never use inline type imports.
- Always favor `@import` syntax at the top of JavaScript files for JSDoc types.
- Use `npm install --ignore-scripts` to install dependencies; this repository intentionally does not commit a package lockfile.
- Run `npm test` for the complete lint, type-check, and test suite.
- This repository does not require declaration builds during normal development; run them only for publishing or when debugging generated types.
- Remove generated declarations and declaration maps from `lib` after a declaration build unless they are the intentional change.
- Preserve file-copying and watch behavior across the supported Node.js versions and Windows, macOS, and Linux.
- When handling PR review comments, validate that each comment is correct before making changes; maintainer comments are almost always valid, but review bot comments may be wrong, and after addressing a comment, always reply with what was done.

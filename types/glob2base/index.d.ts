declare module 'glob2base' {
  import type { Minimatch } from 'minimatch'
  function glob2base(obj: { minimatch: Minimatch }): string
  export default glob2base
}

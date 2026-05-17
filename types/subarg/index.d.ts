declare module 'subarg' {
  interface SubargResult {
    _: string[]
    [key: string]: unknown
  }
  function subarg(args: string[], opts?: Record<string, unknown>): SubargResult
  export default subarg
  export type { SubargResult }
}

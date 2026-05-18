declare module 'shell-quote' {
  type ParseEntry = string | { op: string } | { comment: string }
  function parse(
    cmd: string,
    env?: Record<string, string> | ((key: string) => string | undefined)
  ): ParseEntry[]
  function quote(args: string[]): string
  export { ParseEntry, parse, quote }
}

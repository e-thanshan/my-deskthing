// the extension runs under deno but @bridgething/extension typechecks against deno's own
// globals separately and does not ship them, so declare the slice this extension uses.

declare namespace Deno {
  type StdioOption = 'piped' | 'inherit' | 'null';

  interface CommandOutput {
    readonly success: boolean;
    readonly code: number;
    readonly stdout: Uint8Array;
    readonly stderr: Uint8Array;
  }

  interface CommandOptions {
    args?: readonly string[];
    stdout?: StdioOption;
    stderr?: StdioOption;
  }

  class Command {
    constructor(command: string, options?: CommandOptions);
    output(): Promise<CommandOutput>;
  }
}

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

  function readTextFile(path: string): Promise<string>;

  const env: { get(key: string): string | undefined };

  interface HttpClient {
    close(): void;
  }

  function createHttpClient(options: { caCerts?: readonly string[] }): HttpClient;

  const build: { readonly os: string };
}

/** Deno accepts a custom client on `fetch`, which the DOM lib's `RequestInit` does not declare. */
interface RequestInit {
  client?: Deno.HttpClient;
}

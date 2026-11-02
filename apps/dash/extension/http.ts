// deno carries its own root store and never consults the macos keychain, so on a network
// that intercepts tls every fetch dies with UnknownIssuer. hand it the keychain's roots,
// which `security` can export without any permission beyond the run grant already held.
let clientResolved = false;
let httpClient: Deno.HttpClient | undefined;

/** A fetch client trusting the macOS keychain's roots, or undefined to use deno's own store. */
export async function keychainClient(): Promise<Deno.HttpClient | undefined> {
  if (clientResolved) return httpClient;
  clientResolved = true;
  if (Deno.build.os !== 'darwin') return undefined;
  try {
    const out = await new Deno.Command('security', {
      args: ['find-certificate', '-a', '-p'],
      stdout: 'piped',
      stderr: 'null',
    }).output();
    if (!out.success) return undefined;
    const caCerts = new TextDecoder()
      .decode(out.stdout)
      .split(/(?=-----BEGIN CERTIFICATE-----)/)
      .map(block => block.trim())
      .filter(block => block.startsWith('-----BEGIN CERTIFICATE-----'));
    if (caCerts.length > 0) httpClient = Deno.createHttpClient({ caCerts });
  } catch {
    httpClient = undefined;
  }
  return httpClient;
}

/** Releases the shared client. */
export function closeHttpClient(): void {
  httpClient?.close();
}

/** The transport failure deno buries in `cause` (tls, dns, refused), for logging. */
export function describeError(err: unknown): string {
  const cause = (err as { cause?: { message?: string } })?.cause?.message;
  return cause ? `${String(err)} cause: ${cause}` : String(err);
}

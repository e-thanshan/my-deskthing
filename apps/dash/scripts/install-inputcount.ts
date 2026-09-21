/**
 * Installs the keystroke and scroll odometer as a launchd agent.
 *
 * The agent exists because of how macos assigns input monitoring. The grant attaches to the
 * responsible process, and a binary carrying its own developer id and the hardened runtime becomes
 * that process in place of whoever launched it. deno is signed exactly that way, so a helper
 * spawned from the extension is attributed to deno and no grant given to the terminal or to
 * bridgething.app ever reaches it. Under launchd the binary is its own principal.
 *
 * The binary is installed root-owned, in a root-owned directory outside $HOME, because the grant
 * it holds is keylogger-grade. Left user-writable, anything running as the user could swap it and
 * try to inherit an approval already on file. Removing a file needs write permission on the
 * directory rather than on the file, so the directory has to be root-owned as well.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const LABEL = 'io.github.e-thanshan.dash-inputcount';
const INSTALL_DIR = '/usr/local/libexec/dash-inputcount';

const here = dirname(fileURLToPath(import.meta.url));
const home = homedir();
const binPath = join(INSTALL_DIR, 'inputcount');
const dataDir = join(home, 'Library', 'Application Support', 'dash-inputcount');
const countsPath = join(dataDir, 'counts.json');
const plistPath = join(home, 'Library', 'LaunchAgents', `${LABEL}.plist`);
const domain = `gui/${process.getuid?.() ?? 501}`;

// an earlier build of this installer put a user-writable binary here
const legacyBin = join(dataDir, 'inputcount');
const legacySrc = join(dataDir, 'inputcount.c');

function run(command: string, args: string[]): { ok: boolean; err: string } {
  const out = spawnSync(command, args, { encoding: 'utf8' });
  return { ok: out.status === 0, err: (out.stderr ?? '').trim() };
}

function sudo(args: string[]): boolean {
  return spawnSync('/usr/bin/sudo', args, { stdio: 'inherit' }).status === 0;
}

function plist(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${binPath}</string>
    <string>${countsPath}</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>ThrottleInterval</key>
  <integer>300</integer>
  <key>StandardErrorPath</key>
  <string>${join(dataDir, 'stderr.log')}</string>
</dict>
</plist>
`;
}

function uninstall(): void {
  run('launchctl', ['bootout', `${domain}/${LABEL}`]);
  if (existsSync(plistPath)) rmSync(plistPath);
  if (existsSync(INSTALL_DIR)) {
    console.log('removing the root-owned binary needs sudo:');
    sudo(['/bin/rm', '-rf', INSTALL_DIR]);
  }
  console.log(`unloaded ${LABEL} and removed its binary`);
  console.log(`the odometer at ${countsPath} was left alone; delete ${dataDir} to drop it too`);
  console.log('remove the leftover entry under System Settings > Privacy & Security > Input Monitoring');
}

function install(): void {
  const source = join(here, 'inputcount.c');
  if (!existsSync(source)) throw new Error(`missing ${source}`);

  const staging = mkdtempSync(join(tmpdir(), 'inputcount-'));
  const staged = join(staging, 'inputcount');
  const built = run('/usr/bin/clang', [
    '-O2',
    '-o',
    staged,
    source,
    '-framework',
    'ApplicationServices',
    '-framework',
    'CoreFoundation',
  ]);
  if (!built.ok) {
    rmSync(staging, { recursive: true, force: true });
    throw new Error(`clang failed:\n${built.err}`);
  }

  // sudo cannot prompt without one, and its own error does not say to change terminal
  if (!process.stdin.isTTY) {
    rmSync(staging, { recursive: true, force: true });
    throw new Error(
      'this needs a terminal sudo can prompt on. run it from a normal shell rather than through an\n' +
        'editor, agent or CI task, or install the binary yourself with the three commands in install().',
    );
  }

  console.log(`installing into ${INSTALL_DIR}, which needs sudo:`);
  const placed =
    sudo(['/usr/bin/install', '-d', '-o', 'root', '-g', 'wheel', '-m', '755', INSTALL_DIR]) &&
    sudo(['/usr/bin/install', '-o', 'root', '-g', 'wheel', '-m', '755', staged, binPath]) &&
    // kept beside the binary, read-only, so what is running is always auditable next to it
    sudo(['/usr/bin/install', '-o', 'root', '-g', 'wheel', '-m', '644', source, join(INSTALL_DIR, 'inputcount.c')]);
  rmSync(staging, { recursive: true, force: true });
  if (!placed) throw new Error('could not install the binary; nothing was loaded');
  console.log(`installed ${binPath} as root:wheel`);

  mkdirSync(dataDir, { recursive: true });
  mkdirSync(dirname(plistPath), { recursive: true });

  for (const stale of [legacyBin, legacySrc]) {
    if (!existsSync(stale)) continue;
    rmSync(stale);
    console.log(`removed the older user-writable copy at ${stale}`);
  }

  writeFileSync(plistPath, plist());
  run('launchctl', ['bootout', `${domain}/${LABEL}`]);
  const loaded = run('launchctl', ['bootstrap', domain, plistPath]);
  if (!loaded.ok) throw new Error(`launchctl bootstrap failed:\n${loaded.err}`);
  run('launchctl', ['kickstart', '-k', `${domain}/${LABEL}`]);
  console.log(`loaded ${LABEL}`);

  console.log('');
  if (run(binPath, ['--probe-only']).ok) {
    console.log('input monitoring already granted; the ribbon should fill in within a few seconds');
    return;
  }
  console.log('one thing left, and only you can do it:');
  console.log('');
  console.log('  System Settings > Privacy & Security > Input Monitoring');
  console.log('  press +, then shift-cmd-G and paste this path:');
  console.log('');
  console.log(`      ${binPath}`);
  console.log('');
  console.log('  turn it on. launchd restarts the agent within 5 minutes, or force it now with:');
  console.log('');
  console.log(`      launchctl kickstart -k ${domain}/${LABEL}`);
  console.log('');
  console.log('  if an entry for the old path under Application Support is still listed, remove it.');
  console.log('');
  console.log(`counts land in ${countsPath}, and the extension reads them from there.`);
}

if (process.argv.includes('--uninstall')) uninstall();
else install();

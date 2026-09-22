# dash

## 0.15.1

the keys and scrolled cells could sit on a number that had stopped being true. the agent only
rewrites its file when one of the counts moves, so an idle machine gives the extension nothing to
forward, and from the device a feed that has gone away looks exactly like an owner who has stopped
typing: either way nothing arrives. the last reading stayed on screen, presented as live, which is
what a closed dev server or an older extension without the odometer in it looked like.

the extension now resends its last reading every thirty seconds whether or not it changed, so the
two cases can be told apart, and the ribbon dims both cells and says it has no reading from the
computer once three of those heartbeats go unheard. an idle machine keeps showing its totals at
full strength, because the heartbeat still arrives.

## 0.15.0

a ribbon of running totals sits under the progress bar, on preset 2. it takes its height from a
spacer rather than clipping itself open, so the bar and the lyrics slide up to make room and a
readout is free to overflow above the rule. back logs a drink whether or not the ribbon is open,
so the common case is one press and no screen at all. each press throws a `+1 drink` up out of the
drinks cell and fades it: the ribbon fades its readouts rather than the row itself, so the cell
keeps its box while shut and a floater launched over a closed ribbon still has somewhere to launch
from.

listening time is counted on the device from the playhead, which means it is what this screen
witnessed rather than everything the account played: a phone listening with the car thing unplugged
adds nothing. the totals are written back as absolute numbers a second after they move, so a
dropped write costs the interval it covered and the next one puts the figure right again, and a
stored total is folded into whatever accumulated while the read was still in flight so a drink
logged in the first second is never overwritten by the load landing on top of it.

keystrokes and scrolled distance come from a separate launchd agent, since nothing on the device or
the phone can see the computer's input. `bun run install-inputcount` builds `scripts/inputcount.c`
into `/usr/local/libexec/dash-inputcount` and registers it; the extension only reads the json
odometer the agent leaves under application support, so the app itself asks for one more read path
and nothing else. the agent links no networking and holds no key identities, so the two numbers the
device draws are the only thing anything downstream ever sees.

the binary is installed root owned, in a root owned directory outside the home directory, which is
the one part of this worth a sudo prompt. the grant it holds is keylogger grade whatever the code
does with it, and a binary left somewhere the user can write is a binary anything running as the
user can swap for another one under an approval already on file. removing a file needs write
permission on the directory rather than on the file, so the directory has to be root owned too.

it is an agent rather than a child of the extension because of how macos assigns input monitoring.
the grant attaches to the responsible process, and a binary carrying its own developer id and the
hardened runtime becomes that process in place of whoever launched it. deno is signed exactly that
way, so a helper spawned from the extension is attributed to deno no matter whether the terminal or
bridgething.app started the chain, and granting either of those never reaches it. under launchd the
binary is its own principal and holds its own grant, which also survives deno being upgraded out
from under it. the tap is listen-only, which can neither alter nor drop an event, and counts events
without recording which keys they were.

the agent owns the odometer, so the totals keep climbing with bridgething closed and are read back
from the file on restart rather than beginning again at zero, a revoked grant included. it exits
when the grant is missing instead of waiting for one, because input monitoring only takes hold for
a freshly started process, and launchd brings it back on a five minute throttle so granting it is
all the user has to do. without the agent the two cells are simply absent; without the grant the
ribbon says so in a line where they were, and the extension says so once in the log, since silence
there reads exactly like a working counter watching nobody type.

scrolled distance is reported in feet until there is a mile of it, because a mile is about eight
million scroll points and the odometer would otherwise read zero for months.

## 0.14.1

the bars never appeared on a machine whose network inspects tls. deno carries its own root
certificates and never consults the login keychain, so a corporate root that every other tool on the
machine trusts is unknown to the extension, and each poll died as an opaque `fetch failed`. the
extension now exports the keychain's roots through the `security` binary it already had a run grant
for and hands them to its own http client, which needs no new permission and is additive, so a
machine with nothing intercepting behaves as before. non-macos hosts keep deno's own roots.

a fetch that fails now logs the transport reason deno hides in `cause`, rather than only the
`TypeError` that says nothing about which half broke.

## 0.14.0

two claude usage bars sit under the clock: the session window and the weekly one, each a short
capsule with the percentage beside it. the account's own limit list names each window, carries an
already scaled percentage and says which of them deserves attention, so a bar turns from ember to
red when the account says so rather than at a threshold picked here; a window with no severity of
its own falls back to four fifths spent. a per model weekly cap labels itself with the model's
display name and is preferred over the all models weekly, which stands in when there is no scoped
cap. a window whose reset has already passed reads zero rather than showing last period's number,
and the pair fades back when the reading is more than fifteen minutes stale.

the numbers come from a new desktop extension, since the usage figures live with claude code on the
computer and nothing on the device or the phone can reach them. it reads the oauth token out of the
login keychain on each poll, so claude code stays the only thing refreshing it, and asks the usage
endpoint every five minutes. the screen asks for the last reading as soon as it loads instead of
waiting on the next poll, so a page opened between them is not blank for five minutes. with no
computer attached, or the extension disabled, the bars are simply absent and the rest of the screen
is unchanged.

## 0.13.0

the screen parks itself once a day, on the same slat sweep as the Mode hold, at 5:30 pm out of the
box. Auto off is the second row of the settings panel, a track across the day in half hour steps
with off in the leftmost sliver: dial it to nudge, or tap it to jump, since a whole day is more
detents than anyone wants to turn through. only the crossing of the time counts, so a screen already
parked is left alone, one woken later in the evening stays on until tomorrow rather than going dark
under your hand, and moving the setting onto a time already past waits for the next day. the time
comes from the phone's clock and zone, so a device whose own clock has drifted cannot fire it early,
and nothing fires at all until the daemon has reported a time.

the Lyric offset setting is gone, along with the trim it applied. it was correcting for a gap the
daemon's playhead does not actually have, so the lyrics now run straight off the playhead like the
progress bar always did

## 0.12.0

the device is always on power, so it now has a way to look off without being shut down. hold Mode
for a second and a row of vertical slats flips closed in a wave from left to right, the way a
tri-vision billboard turns over, and the backlight drops to zero behind it. any press brings it
back. music keeps playing throughout, so this parks the screen rather than the app, which is also
what spares the one part of the hardware that continuous use actually wears: the backlight.

the brightness that was in force is captured before it is overridden and restored on the way back,
auto mode included. it is also parked in the store, so a reload or a crash while dark puts the
backlight back instead of leaving a screen nothing on the device could brighten again. no step of
the sequence waits on the daemon, because a wake that did could have left the screen dark for good
the one time the daemon was gone. while the screen is parked the page ignores input, and neither the
release of the hold nor its auto-repeat counts as the press that wakes it

## 0.11.0

measured the daemon's playhead against the music across a pause: it is accurate to a few ms and
already pause-aware, so the sync tools built on the opposite assumption are gone. the hidden trim on
presets 2 and 3 wrote a value that survived every restart and silently delayed the lyrics on every
track, and the re-anchor pause-and-resume only re-triggered the audio gap it was meant to close.
what is left is one visible Lyric offset in the settings panel, applied to the lyrics alone so the
progress bar keeps reading the truth. the playhead also ticks at 100ms instead of 250ms, so a line
can no longer land a quarter second late

## 0.10.0

preset 4 opens a settings panel driven entirely by the dial: turn to move, press to select, turn to
set a value, press to keep it. first setting is night shift, a warm tint over the whole screen from
off to quite warm, stored on the device. lyrics move to preset 1 and re-anchoring the playhead moves
into the panel; sync trim stays on presets 2 and 3

## 0.9.0

sync trim on presets 2 and 3, hard re-anchor on preset 1, stale-poll guard

## 0.8.3

re-anchor the playhead every few seconds and extrapolate on a monotonic clock

## 0.8.2

failed lyric lookups retry instead of caching as none; distinct unsynced/error messages

## 0.8.1

song details set in Fraunces italic

## 0.8.0

fix motion stutter after minutes (fp16 time precision); Fraunces clock; darker lyric scrim

## 0.7.0

preset 4 toggles a two-line live lyric above the progress bar

## 0.6.2

show the waiting hint while connecting, not after

## 0.6.1

remove the retired painted-scene code; artist and album share one line

## 0.6.0

the photo comes alive: webgl warp drifts the clouds and sways trees and grass

## 0.5.1

stop truncation from clipping serif descenders

## 0.5.0

song details set in TeX Gyre Bonum (bundled, GUST license); album line italic

## 0.4.1

paused playback dims the progress bar fill

## 0.4.0

still photo background (bundled highland cottage image) replaces the animated scene

## 0.3.0

painterly scene rework; custom background image slot in Backdrop.tsx; larger song details

## 0.2.0

song details top-left with truncation; animated cottagecore autumn scene with falling leaves and chimney smoke

## 0.1.0

First release.

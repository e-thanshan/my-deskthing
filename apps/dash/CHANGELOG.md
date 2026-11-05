# dash

## 0.19.0

the drinks and listened totals lived only on the car thing, in the storage it gives each webapp,
and uninstalling dash deletes that storage along with the app. keys and scrolled came through a
reinstall untouched because the computer counts those, and now the computer keeps a copy of the
other two as well.

the extension writes them to `stats.json`, next to the input odometer in
`~/Library/Application Support/dash-inputcount`. whenever dash opens with the desktop app running,
the car thing reads that file and keeps the higher of its own number and the file's for each
total, so a fresh install picks up where the old one left off. anything counted before the file
is read is added on top rather than lost. the file only ever goes up, so it is safe to raise a
number in it by hand. if a hand edit leaves it unreadable, the extension leaves it alone and says
so in the desktop app's log rather than writing over it.

the extension could already read the odometer's file, and that grant now covers the whole folder,
for reading and for writing, which the desktop app asks you to confirm. writing to the folder lets
the extension create it on a computer that never installed the odometer, and replace the file in
a single step so a half-written copy never exists.

## 0.18.1

the painting crosses the cable as one message, and the link between the computer and the car thing
drops any message near a megabyte. every painting until now had come in under that, and the one
picked on 4 november did not. the link fell over while carrying it, came back, offered the same
painting, was asked for it again and fell over again, so with dash on screen the car thing kept
disconnecting and reconnecting a second later.

the computer now shrinks each painting before sending it, down to the smallest size that still
covers the 800 by 480 screen, which is all the screen ever showed of it anyway, and re-encodes it.
each source pixel is averaged into the ones it lands on rather than sampled, so brushwork and canvas
grain stay put instead of shimmering into moire. that one painting went from 841 KB to 132 KB and
looks the same on the screen. should a painting still come out heavy, the quality steps down until
it fits, so no painting is turned away for its weight any more, and the museums' images are allowed
to arrive at up to 4 MB.

a painting the computer had already cached too big to send, today's included, is compressed the
same way when the extension starts, which ends the loop as soon as this version is installed.

## 0.18.0

preset 3 belongs to the painting now. hold it for half a second and everything but the painting
fades away, the song, the clock, the bar and the ribbon, leaving the credit line so you still know
what you are looking at. the credit slides down into the corner the bar leaves empty, however
far that is with the ribbon open or shut. let go and it all fades back, and the credit rises to
its place above the bar. the volume dial and the other presets carry
on as normal underneath.

a tap opens a menu for the painting, and another tap closes it, as does back. the left half holds
the title, the artist and date, and the museum's own description of the work where the museum
writes one, which chicago and cleveland mostly do. the right half has four things to turn to:

- another painting finds a different one for today. each skip starts from the next museum along,
  so three in a row visit all three collections, and a skipped painting never comes back as the
  replacement.
- previous painting undoes that, and also reaches back to yesterday's. the last three are kept.
- save to list writes the painting to `~/dash-paintings.md` on the computer, with the museum's
  page for it and the description underneath, and only ever once.
- whole painting shows the entire canvas instead of filling the screen, sat on a blurred and
  darkened copy of itself, for the paintings the crop treats badly. it is remembered.

the dial belongs to the menu while it is open. preset 4 closes it on its way to the settings,
and preset 3 closes the settings on its way to the menu. the first three actions need the
computer, so with the desktop app closed the menu says so after a few seconds rather than
waiting forever.

cleveland's search matches the word landscape anywhere in a record, and once handed over a page of
calligraphy. a cleveland painting now also has to read as a landscape in its titles or its
descriptions, and calligraphy, portraits and still lifes are turned away by name. the national
gallery of denmark marks its english titles in danish, as `engelsk`, which the picker had been
reading past to the danish title. it now finds the english one, and prefers paintings that have
one. some of denmark's works survive online only as an old black and white photograph, and those
are passed over too: the museum publishes a palette for each image, and theirs is all greys.

the list lives in the home folder rather than documents because macos keeps background processes
out of documents, desktop and downloads, and the extension is one. writing it adds one file to the
extension's permissions, `~/dash-paintings.md`, which the desktop app asks you to confirm.

## 0.17.1

of the three museums 0.17.0 drew from, only cleveland was ever handing over a painting. the met has
retired its public collection api and now answers every search with `410 gone`, and the art
institute of chicago's image server refused each download until it was told who was asking. the
met is replaced by the national gallery of denmark, whose open collection has some fifteen hundred
public domain landscape paintings, and the chicago downloads now carry the identifying header that
museum asks api clients to send. all three come through.

the denmark collection files its painters surname first, so the credit flips them back to read
the way a name is said.

the network permissions swap the met's two hosts for denmark's, `api.smk.dk` and `iip.smk.dk`, so
the desktop app asks you to confirm the change.

the credit line sat at sixty percent white and thinned out to almost nothing over a sunlit
foreground. it is at seventy now with the title at eighty five, the same lift the ribbon's labels
needed in 0.16.0.

## 0.17.0

the backdrop is a landscape painting now, and a different one every day. the desktop extension
picks it from the open collections of the art institute of chicago, the cleveland museum of art
and the met, taking each museum in turn and falling through to the next when one is down. it only
keeps a painting wider than it is tall, big enough to fill the screen without blurring, and one
that has not been shown in the last year. a line above the progress bar credits it: the title,
the artist and date, and the museum. it steps aside while lyrics are up.

the car thing has no internet of its own, so the computer fetches the painting and hands it over
the cable. the device keeps the last one it was given, and a screen that boots with the desktop
app closed still shows that painting rather than an empty background. the computer checks the date
every quarter of an hour, so a machine that slept through midnight catches up when it wakes, and
the new painting fades in over the old.

reaching the museums takes six more hosts in the extension's network permissions, which the
desktop app asks you to confirm on install.

the cottage that swayed in the wind is retired. its photo and the webgl warp that moved it live on
in `archive/living-photo`, outside the build, with a note on putting them back. dropping the
photo makes the bundle about 340 KB lighter.

## 0.16.0

the scrolled cell no longer reads in feet and miles. every time the ribbon opens it picks a fresh
unit, from planck lengths and beard-seconds through barleycorns, smoots and furlongs to trips
around the world, AU, light-years and kessel runs. the units are dealt from a shuffled deck, so all
thirty come round before any of them repeats and the same one never shows twice in a row. it stays
put while the ribbon is open, and the next one fades in with the ribbon.

those units span fifty orders of magnitude, so anything a fixed format would print as a wall of
zeros or digits goes to three figures of scientific notation instead. the unit's name sits after
the number in small type.

with a long unit in the cell, the no-reading note could no longer fit beside the value row and
went off the edge of the screen. it now sits up on the label row at the right, out of the flow,
where nothing can push it.

the ribbon's labels sat at forty five percent white on the brightest strip of the backdrop, the
cottage wall and the path in front of it, and mostly disappeared. opening the ribbon now brings up
the same dark scrim the lyrics use, the labels are at seventy percent, and every glyph on the ribbon
carries a tight dark edge under its soft shadow so small type holds against the grass.

## 0.15.2

the `+1 drink` popup was drawing on every press with the ribbon shut, exactly as intended, and
could not be seen doing it. it is ember at seventeen pixels over whatever the album art happens to
be, and against a sunlit wall that is nothing at all, so a press that worked looked like a press
that had not registered.

it is now twenty six pixels and bold, and carries its own dark halo in three stacked shadows rather
than trusting the backdrop to be dark. artwork is any colour it likes and the floater has to hold
its own against all of it.

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

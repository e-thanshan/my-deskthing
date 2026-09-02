# dash

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

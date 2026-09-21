/*
 * Keystroke and scroll odometer for the dash stats ribbon.
 *
 * Runs as a launchd agent so that launchd is its parent: a binary spawned directly by launchd is
 * its own TCC principal and gets its own Input Monitoring grant. Spawned instead from the
 * bridgething extension it would be attributed to deno, which is hardened-runtime signed and so
 * becomes the responsible process in place of whatever launched it.
 *
 * The tap is listen-only, which can neither alter nor drop an event, and counts events without
 * recording which keys they were.
 */

#include <ApplicationServices/ApplicationServices.h>
#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <unistd.h>

#define EMIT_SECONDS 2.0

static unsigned long long keys = 0;
static double scrollPoints = 0;
static unsigned long long writtenKeys = 0;
static double writtenScroll = 0;
static CFMachPortRef tap = NULL;
static char outPath[1024];
static char tmpPath[1032];

static long long nowMs(void) {
  return (long long)time(NULL) * 1000;
}

/* rename is atomic, so a reader never catches a half written file */
static void writeCounts(const char *status) {
  FILE *f = fopen(tmpPath, "w");
  if (!f) return;
  fprintf(f, "{\"status\":\"%s\",\"at\":%lld,\"keys\":%llu,\"scrollPoints\":%.1f}\n", status, nowMs(), keys,
          scrollPoints);
  fclose(f);
  rename(tmpPath, outPath);
  writtenKeys = keys;
  writtenScroll = scrollPoints;
}

/* the odometer has to survive a reboot, and this program is the only writer of the file it reads
   back, so picking the two numbers out by hand beats linking a json parser */
static void resume(void) {
  FILE *f = fopen(outPath, "r");
  if (!f) return;
  char buf[512];
  size_t n = fread(buf, 1, sizeof(buf) - 1, f);
  fclose(f);
  buf[n] = '\0';
  const char *k = strstr(buf, "\"keys\":");
  const char *s = strstr(buf, "\"scrollPoints\":");
  if (k) keys = strtoull(k + 7, NULL, 10);
  if (s) scrollPoints = strtod(s + 15, NULL);
  writtenKeys = keys;
  writtenScroll = scrollPoints;
}

static CGEventRef onEvent(CGEventTapProxy proxy, CGEventType type, CGEventRef event, void *info) {
  (void)proxy;
  (void)info;
  if (type == kCGEventKeyDown) {
    keys++;
  } else if (type == kCGEventScrollWheel) {
    double dy = CGEventGetDoubleValueField(event, kCGScrollWheelEventPointDeltaAxis1);
    double dx = CGEventGetDoubleValueField(event, kCGScrollWheelEventPointDeltaAxis2);
    scrollPoints += fabs(dy) + fabs(dx);
  } else if (type == kCGEventTapDisabledByTimeout || type == kCGEventTapDisabledByUserInput) {
    if (tap) CGEventTapEnable(tap, true);
  }
  return event;
}

static void emit(CFRunLoopTimerRef timer, void *info) {
  (void)timer;
  (void)info;
  if (keys == writtenKeys && scrollPoints == writtenScroll) return;
  writeCounts("counting");
}

int main(int argc, char **argv) {
  /* the installer asks before telling the user whether there is anything left to do */
  if (argc > 1 && strcmp(argv[1], "--probe-only") == 0) {
    return CGPreflightListenEventAccess() ? 0 : 1;
  }

  const char *home = getenv("HOME");
  if (argc > 1) {
    snprintf(outPath, sizeof(outPath), "%s", argv[1]);
  } else if (home) {
    snprintf(outPath, sizeof(outPath), "%s/Library/Application Support/dash-inputcount/counts.json", home);
  } else {
    fprintf(stderr, "no output path given and no HOME to derive one from\n");
    return 2;
  }
  snprintf(tmpPath, sizeof(tmpPath), "%s.tmp", outPath);

  resume();

  /* exit rather than wait: input monitoring only takes effect for a freshly started process, so
     launchd restarting this one on its throttle is what picks the grant up */
  if (!CGPreflightListenEventAccess()) {
    CGRequestListenEventAccess();
    writeCounts("needs-permission");
    fprintf(stderr, "input monitoring is not granted to this binary; exiting for launchd to retry\n");
    return 3;
  }

  CGEventMask mask = CGEventMaskBit(kCGEventKeyDown) | CGEventMaskBit(kCGEventScrollWheel);
  tap = CGEventTapCreate(kCGSessionEventTap, kCGHeadInsertEventTap, kCGEventTapOptionListenOnly, mask, onEvent,
                         NULL);
  if (!tap) {
    writeCounts("needs-permission");
    fprintf(stderr, "could not create the event tap; exiting for launchd to retry\n");
    return 3;
  }

  CFRunLoopSourceRef source = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, tap, 0);
  CFRunLoopAddSource(CFRunLoopGetCurrent(), source, kCFRunLoopCommonModes);
  CGEventTapEnable(tap, true);

  /* publish the resumed totals at once so a reader is never told the odometer is at zero */
  writeCounts("counting");

  CFRunLoopTimerRef timer = CFRunLoopTimerCreate(kCFAllocatorDefault, CFAbsoluteTimeGetCurrent() + EMIT_SECONDS,
                                                 EMIT_SECONDS, 0, 0, emit, NULL);
  CFRunLoopAddTimer(CFRunLoopGetCurrent(), timer, kCFRunLoopCommonModes);

  fprintf(stderr, "counting to %s\n", outPath);
  CFRunLoopRun();
  return 0;
}

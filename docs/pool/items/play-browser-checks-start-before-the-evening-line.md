---
id: play-browser-checks-start-before-the-evening-line
title: "A browser check that starts a new life begins while the opening's evening line is still to come"
area: play
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by: red-main
pr:
after:
blocked-on:
lead: play-first
source: "Blockers on the crew issue 9747, Nov 16, 2026: escape-closes-what-is-open is red on main"
model: fable
effort: medium
root: none
---

**What.** The browser check `escape-closes-what-is-open` fails on main at every drawn place with "who: the clock shows". The check presses Escape while a talk is on screen, where the player's card and clock are hidden. Any check that starts a fresh life can begin in the same gap.
Seen: the check's run on main at Glasgow, Oregon and four other drawn places.

**Cause.** Measured: at Peach Springs, Arizona, seed 6764b41c-4260-4539-b075-6f84e8044010, by `BENCH_BROWSER=/opt/pw-browsers/chromium node src/bench/escape-closes-what-is-open.browser.mjs` on main 74e6551b with a log of the talk box: the President's address closes, the room and card show for 719 ms, then the evening's line opens in the same box. The page hides the talk, asks the server for the room, and only then lands the line (`landHome` in src/bench/play.mjs). `finishTalk` in src/bench/start-life.mjs returned the first time it read the talk as closed, inside that gap.

**Fix.** In `finishTalk` (src/bench/start-life.mjs), a closed talk is read again once the page's own requests have ended, and the opening is over only when the talk is still closed then. The helper counts the page's requests from the start of `startLife`. No fixed wait. The player sees nothing new; the room showing for 700 ms between the address and the evening line is a note for Screens.

**Time box.** 1 hour for one session at medium effort. When it runs out, push what is found, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: the check draws its place and names it with its seed. No dice: nothing here decides an actor's outcome.

**Done when.** A second session, not the builder, runs the Escape browser check three times on the bench at a drawn place it names with its seed (for example Matu'u, American Samoa), sees it end "PASS Escape closes what is open, then opens Options" each time, and says so with `npm run pool -- seen`.

**Waits on.** Nothing.

**Files.** src/bench/start-life.mjs

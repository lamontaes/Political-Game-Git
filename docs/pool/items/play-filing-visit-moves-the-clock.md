---
id: play-filing-visit-moves-the-clock
title: "Filing at the clerk's office leaves the clock where it was: the 3-hour visit spends no time"
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: split from play-stop-07-every-day-starts-at-midnight by opus-5234, Nov 11, 2026 (the Nov 10 replay, PR 8324)
lead: play-first
after:
model: sonnet
effort: medium
root: none
claimed-at:
branch:
---

**What.** Filing for office at the clerk's office is a three-hour visit (`filingVisitHours`, 3, the CTO's Oct 28 note that filing spends the afternoon), but the clock does not move: the Nov 10 replay of play-stop-07 filed for Council member in Newbury, Vermont (seed 7c0de5ee-1111-4222-8333-444455556666) and in Benson, Pennsylvania (seed 5b7cd44f-fa1a-490f-be08-7ae9bb4f3288) and read 8:00 AM before and after (docs/reports/seen-2026-11-10-play-stop-07-clock.md on branch claude/pool-play-stop-07-every-day-starts-at-midnight). The rest of play-stop-07 passed in that replay: Day lands on the next morning, and travel to a closed office waits for it to open. Seen: the clock card after filing, which should read three hours later.

**Cause.** Found in code: `/api/filing/choose` in src/bench/handler.ts (line 1845) spends the visit with `state.player?.spend(filingVisitHours)`, and `BenchPlayer.spend` in src/bench/player.ts (line 242) returns undefined while the player's packet is not `complete`. At the clerk's office the filing's own story is the open packet (kind `stop`, the visit's scene), so the spend does nothing and the handler sends no packet. The check that should catch it accepts it: src/bench/filing.browser.mjs (line 244) passes when the clock moved or when the packet `kind === "stop"` holds it.

**Fix.** In `/api/filing/choose`, when the open packet is the filing visit's own stop, spend the visit's hours from that stop's moment: end the stop as lived through `BenchPlayer.resume({ kind: "stop", pauseId })`, then `spend(filingVisitHours)`, and send the packet it returns. Tighten src/bench/filing.browser.mjs (line 244) to require the clock to move by the visit's hours, removing the `held` pass. Change nothing else in `spend`.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Ask why: name the packet that held the clock and the pause id the fix ends. Never weaken a test: the browser check gets stricter, not looser. One rule, all 56 places: the place is drawn and named with its seed.

**Done when.** A second session starts the bench in a drawn place (place and seed named), travels to the town's filing office during its hours, files for a seat, and sees the clock card move by three hours at 1440x900 (a screenshot before and after), and `node src/bench/filing.browser.mjs` passes in two drawn places with the held-clock pass removed.

**Waits on.** Nothing.

**Files.** src/bench/handler.ts, src/bench/player.ts, src/bench/filing.browser.mjs

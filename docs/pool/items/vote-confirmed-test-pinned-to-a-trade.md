---
id: vote-confirmed-test-pinned-to-a-trade
title: "The vote-confirmed scene test draws four places at run time and can find no committee trade in any"
area: director
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: Account lead, Nov 16, 2026, on #9568 (the test is red on the clean Train with seed f9df21488a42d8ea9377bb4c5c6b21eff88494a5)
checked: opus 2026-11-16
---

**What.** `src/director/vote-confirmed-scene.test.ts` needs a rare event: a full-person legislator's vote traded in committee that reaches the floor. It hunts for one at run time. It takes a random seed (or `GOLDEN_PATH_SEED`), draws four places in turn, plays up to 90 days in each and fails when none has a trade.
Seen: seed f9df21488a42d8ea9377bb4c5c6b21eff88494a5 on the clean Train ef70819622c9bc399e73c39e928c226e1f35afee, red in 350 s: "no committee trade by a watched member reached the floor in 90 days in St. Paul, Nebraska; Ruby, Michigan; Offerman, Georgia; Conway, New Hampshire". The same seed is red on #9568's base and head.

**Cause.** Found in code: src/director/vote-confirmed-scene.test.ts draws `drawPlace(\`${seed}:${attempt}\`, "vote-confirmed-scene")` for four attempts with a random default seed (lines 22 to 32), so whether it passes depends on the draw. This breaks the lead's Nov 14 ruling for train tests: pin one place, world seed and case chosen from data, with no run-time draw loop.

**Fix.** Write a script outside the test, capped at one hour, that builds drawn worlds and plays them until a full-person legislator's committee trade reaches the floor. Record the place, the world seed and the bill. Pin the test to that place and seed, with no random default, no attempts loop and a limit near twice its time. If the hour finds no trade, name what the legislature engine would need for one and file that instead.

**Time box.** 2 hours for one Sonnet session; push what passes and set the state honestly when it runs out.

**Rules.** One rule, all 56 places: the pinned place is found by a script over drawn places, and the test names it with its world seed instead of drawing at run time. No dice: the trade comes from the legislature engine's own committee markup in a played world, never from staging a trade by hand.

**Done when.** The test names one place and world seed, passes in under its limit on the Train, and is seen red once on a head where the floor day's vote-promise is not written. A second session plays that place in the running game to the floor day and sees the sponsor's vote-confirmed scene with the member about that bill.

**Waits on.** Nothing.

**Files.** src/director/vote-confirmed-scene.test.ts

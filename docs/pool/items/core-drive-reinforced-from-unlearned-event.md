---
id: core-drive-reinforced-from-unlearned-event
title: "A drive is reinforced from an event its person never learned, and the bench world crashes with validation on (Londonderry, Vermont)"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
source: added with npm run pool -- add
lead: m0-m2
standard: 2
model: sonnet
effort: high
root: none
checked: fable 2026-11-10
claimed-at:
branch: claude/pool-core-drive-reinforced-from-unlearned-event
---

**What.** With bookkeeping on (tests and the bench), the bench world for Londonderry, Vermont (5040150), drawn from run seed 8debd6359985db99f65c53d2477a3c135f906e316e584b9f3f88ad8dcbe579e0 with drawPlace(seed, 'filing-intro'), advanced a week at a time from January 20, 2025, throws 'Drive requires a learned source event and a finite strength.' on 2025-10-01 on main da7ec81210. The stack is src/core2/state.ts updateDrive (line 2128) from src/core2/modules/drives.ts writeDrive, reinforce (line 397), respond (line 764) and onEvent (line 1930): the drives engine reinforces a drive for a person from an event that person has no experienced knowledge of, or an event id that is not recorded. Play does not check, so a drive can form from something the person never lived through. Found by Lane 1 while checking the one-council-race branch, whose filing-intro test now advances weeks.

**Cause.** Found in code: src/core2/state.ts `updateDrive` (line 2128) throws "Drive requires a learned source event and a finite strength." (line 2142) when the drives engine (src/core2/modules/drives.ts: `reinforce` at line 397, `respond` at line 764, the `onEvent` hook at line 1930) reinforces a drive from an event the person never learned. Measured: Londonderry, Vermont (5040150), run seed 8debd6359985db99f65c53d2477a3c135f906e316e584b9f3f88ad8dcbe579e0, drawPlace(seed, 'filing-intro'), advanced weekly from 2025-01-20, throws on 2025-10-01; second case Deenwood, Georgia (seed abc123) through jobs.ts reviewTurnover to layOff to work.job-lost to drives respond.

**Fix.** Make the drives engine write the person's experienced knowledge of the event before it reinforces, or not reinforce. Never weaken the check. Add a test that reproduces the reinforce path.

**Time box.** 3 hours for a Sonnet session.

**Rules.** Ask why: a drive forms only from an event the person lived through, by record. Never weaken the check: the drives engine writes the experienced knowledge first or does not reinforce. One rule, all 56 places: proven on the Londonderry seed and fresh draws.

**Done when.** A second session, in a drawn place, advances the Londonderry, Vermont world from run seed 8debd6359985db99f65c53d2477a3c135f906e316e584b9f3f88ad8dcbe579e0 for 104 weeks with bookkeeping on without a throw, and the Deenwood, Georgia world (seed abc123) a year past its start. The PR names the event kind and person that crashed and the line that skipped their knowledge, and a test reproduces the reinforce path and fails when the fix is undone.

**Waits on.** Nothing.

**Files.** src/core2/modules/drives.ts, src/core2/state.ts

**Notes.** TODO

Dev Mode, Nov 8: the same throw (via jobs.ts reviewTurnover -> layOff -> emit work.job-lost -> drives respond) in Deenwood, Georgia (seed abc123), a world run roughly a year past its start by src/bench/dev-scene.test.ts with bookkeeping on; reproduces from the natural layoff review, not from a dev control.

Released (2026-11-11): Cause does not reproduce on main 25369c9bac: Londonderry VT (5040150, run seed 8debd635...) advanced 60 weeks from 2025-01-20 with bookkeeping on, and the dev-scene world with DEV_MODE_SEED=abc123 (Deenwood case), both ran with no throw; fresh 110-week draws were killed by memory, so not proven beyond that. Needs a repro that still fails before it is built. Continue on branch claude/pool-core-drive-reinforced-from-unlearned-event.

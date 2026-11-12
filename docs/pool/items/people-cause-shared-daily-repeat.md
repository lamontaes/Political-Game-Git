---
id: people-cause-shared-daily-repeat
title: "One person shares the same cause with the same neighbor every day for a week (Euharlee, Georgia, seed life-2: Nicholas Phillips to the mayor, May 5 to 11, 2025)"
area: people
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
after:
standard: 2
model: sonnet
effort: low
root: none
lead: lives
checked: fable 2026-11-10
branch: claude/pool-people-cause-shared-daily-repeat
---

**What.** In a played year of Euharlee, Georgia (seed life-2), Nicholas Phillips shared the same cause with the same neighbor, the mayor, every day from May 5 to May 11, 2025. The drives engine is built to tell each person once: its drive-confidant offer skips anyone already in the drive's told set and the share effect adds the target to that set. So either the told set is not kept across days, a second drive on the same topic offers the same person again, or another path produces the repeat. A worker must reproduce the week before changing anything. Seen: a neighbor hearing the same cause from the same person every day, in talks and the Journal.

**Cause.** Found in code: `planFreeTime` in src/core2/free-block.ts fills every day up to the person's next activation from one scoring pass. Its `used` set resets each day and the pool of scored offers is the same each day, so a `share-cause` offer scored for one confidant is planned again for each following day. `performPlanned` in src/core2/life.ts runs a planned act after checking only that both people are alive, the drive's strength, the free hours and `admits`. The share's only prerequisite is `has-drive` (src/core2/data/drives.json, action `share-cause`; rule in src/core2/modules/life.ts line 344), so nothing re-checks the drive's `told` set. The `drive-confidant` offer provider (src/core2/modules/drives.ts, `untold`) checks `told` only when an offer is made, and the `share-drive` effect adds the target to `told`, so later planned copies still run. Measured: Euharlee, Georgia (1327988), `buildBenchWorld("life-2", gameStartDate(), { twoLevel: true, placeKey: "1327988" })` on main d64255aa. person_610188bf38de941c's drive `cause:us-policy-positions:housing-land-use.allow-multifamily-in-single-family-zones` records a scored `share-cause` at person_409695dc6e82dd2f every day from Apr 21 to Apr 27, 2025. The drive's `told` set already held that person from Apr 21, and the person's own last choice from Apr 22 on was `rest` (reason `planned:utility:time:recover`). Of 14 teller-and-listener pairs with a share since Apr 1, 8 had more than one. Nicholas Phillips no longer exists in this world; the people differ now, but the repeat is the same.

**Fix.** Add an eligibility rule to the drives module, `drive-target-untold`, in the `eligibilityRules` block of src/core2/modules/drives.ts (around line 2126). It returns true when the offer's drive is held and the offer's `targetId` is not in that drive's `told` set. Add it to the `share-cause` action's `prerequisites` in src/core2/data/drives.json beside `has-drive`. `performPlanned` already calls `admits`, so a planned copy for someone already told is skipped and the day's hours stay free. Change nothing in free-block.ts: other planned acts (rest, visits, volunteering) are meant to repeat. Add a test in src/core2/drives.test.ts that forms a shareable drive, plays a week, and asserts that no drive records two `share-cause` acts at the same target. Draw the place with `drawPlace`, per the drawn-place-tests skill, and name it with its seed.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Sliding scales and causes: sharing a cause happens from the person's held drive, its strength and who they have already told, never from a daily chance, so the repeat must have a named cause in those records. Ask why: the proof names the drive id and the earlier cause.shared event ids that should have stopped the second telling.

**Done when.** A second session builds Euharlee, Georgia (1327988) with seed life-2 as in the Cause, plays to May 1, 2025, and lists each drive's `share-cause` acts by drive id and target. No drive tells the same person twice; person_610188bf38de941c tells person_409695dc6e82dd2f once, on Apr 21. One freshly drawn place, named with its seed, shows the same, and the new test in src/core2/drives.test.ts fails on main and passes with the fix.

**Waits on.** Nothing.

**Files.** src/core2/modules/drives.ts, src/core2/data/drives.json, src/core2/drives.test.ts, src/core2/free-block.ts, src/core2/life.ts

**Notes.** TODO Released from idle draft #5217 by the CTO, Oct 26.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): correct the item: rewrite SMART or close (same OD:556 behavior defect).

Lane 5 (pool truth, Nov 3): the item was open but still named an old claim, `claude/political-game-pool-udtiwn` (2026-10-20). Cleared from the front matter and kept here.

**Notes (re-run, 2026-11-11, main 79d23fa596).** Skipped: the item names no command, only a played year (Euharlee, Georgia, seed life-2) and no test or script to run. Nothing was run.

Nov 11 (cause finder for Fable B): reproduced on main d64255aa in Euharlee (seed life-2) with a probe that read `drivesReport` and each drive's `told` set; the probe was undone. The repeat comes from the free-time plan replaying one scored share on each later day, not from the drive forgetting whom it told.

Claimed by next for sonnet-2698 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 06:37 UTC) on branch claude/pool-people-cause-shared-daily-repeat.

Released (2026-11-11): Did not reproduce: with the told-set rule removed, a played-world test (Euharlee, Georgia 1327988, seed life-2, and a drawn place, to May 1 2025, tellings keyed by teller, drive id and target) finds no teller telling the same person twice; the earlier repeat count keyed by drive id alone, which is shared across tellers (drive id is per topic). Branch claude/pool-people-cause-shared-daily-repeat holds the rule and test, unproven; needs the original probe's exact repeat (scored vs performed) before building. Continue on branch claude/pool-people-cause-shared-daily-repeat.

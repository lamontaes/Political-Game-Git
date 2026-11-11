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
effort: medium
root: none
lead: lives
checked: fable 2026-11-10
---

**What.** In a played year of Euharlee, Georgia (seed life-2), Nicholas Phillips shared the same cause with the same neighbor, the mayor, every day from May 5 to May 11, 2025. The drives engine is built to tell each person once: its drive-confidant offer skips anyone already in the drive's told set and the share effect adds the target to that set. So either the told set is not kept across days, a second drive on the same topic offers the same person again, or another path produces the repeat. A worker must reproduce the week before changing anything. Seen: a neighbor hearing the same cause from the same person every day, in talks and the Journal.

**Cause.** Needs cause. Looked at src/core2/modules/drives.ts: the confidant offer skips people in the drive's told set (untold) and the share adds the target to it, so one drive should not repeat; the repeat must come from a second drive for the same topic or another path, and it has not been reproduced.

**Fix.** None until the cause is found.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Sliding scales and causes: sharing a cause happens from the person's held drive, its strength and who they have already told, never from a daily chance, so the repeat must have a named cause in those records. Ask why: the proof names the drive id and the earlier cause.shared event ids that should have stopped the second telling.

**Done when.** A second session replays Euharlee, Georgia with seed life-2 (buildBenchWorld), lists Nicholas Phillips's cause shares from May 5 to May 11, 2025 by event id and sees the cause of the daily repeat named by file and line. After the fix no cause.shared event repeats the same drive and the same neighbor in that week, shown by a test that fails before the fix and passes after, and one freshly drawn place gives the same result.

**Waits on.** Nothing.

**Files.** src/core2/modules/drives.ts, src/core2/data/drives.json, src/core2/drives.test.ts

**Notes.** TODO Released from idle draft #5217 by the CTO, Oct 26.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): correct the item: rewrite SMART or close (same OD:556 behavior defect).

Lane 5 (pool truth, Nov 3): the item was open but still named an old claim, `claude/political-game-pool-udtiwn` (2026-10-20). Cleared from the front matter and kept here.

**Notes (re-run, 2026-11-11, main 79d23fa596).** Skipped: the item names no command, only a played year (Euharlee, Georgia, seed life-2) and no test or script to run. Nothing was run.

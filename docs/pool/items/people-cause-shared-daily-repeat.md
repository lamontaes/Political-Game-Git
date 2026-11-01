---
id: people-cause-shared-daily-repeat
title: "One person shares the same cause with the same neighbor every day for a week (Euharlee, Georgia, seed life-2: Nicholas Phillips to the mayor, May 5 to 11, 2025)"
area: people
kind: bug
priority: 2
size: S
status: open
claimed-by: claude/political-game-pool-udtiwn
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T01:31:38.230Z
---

**What.** In a played year of Euharlee, Georgia (seed life-2), Nicholas Phillips shared the same cause with the same neighbor, the mayor, every day from May 5 to May 11, 2025. The drives engine is built to tell each person once: its drive-confidant offer skips anyone already in the drive's told set (src/core2/modules/drives.ts, around line 1778) and the share effect adds the target to that set (around line 1881). So the told set is not kept across days, a second drive on the same topic offers the same person again, or another path produces the repeat, and which one is not yet known, so a worker must reproduce the week first.

**Rules.** Sliding scales and causes: sharing a cause happens from the person's held drive, its strength and who they have already told, never from a daily chance, so the repeat must have a named cause in those records. Ask why: the proof names the drive id and the earlier cause.shared event ids that should have stopped the second telling.

**Done when.** In a played world (buildBenchWorld) of Euharlee, Georgia with seed life-2, Nicholas Phillips's cause shares from May 5 to May 11, 2025 are listed by event id and the cause of the daily repeat is named by file and line; after the fix no cause.shared event repeats the same drive and the same neighbor in that week, shown by a test that fails before the fix and passes after, and one freshly drawn place gives the same result. **On screen.** Nothing yet: it would show on Politics → Government, and nothing there reads it.

**Files.** src/core2/modules/drives.ts, src/core2/data/drives.json, src/core2/drives.test.ts

**Notes.** TODO Released from idle draft #5217 by the CTO, Oct 26.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): correct the item: rewrite SMART or close (same OD:556 behavior defect).

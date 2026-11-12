---
id: core-m7-01-speed-and-memory
title: "M7-01 Speed and memory"
area: core
kind: feature
priority: 3
size: S
status: open
claimed-by:
pr:
after:
blocked-on: not scheduled: a roadmap milestone at priority 3 until the weekly reschedule (AGENTS.md: saves and release work wait for early-access preparation); an L item is split by whoever claims it once scheduled
milestone: M7
source: "docs/roadmap/later-specs-draft.md M7-01"
claimed-at:
lead: speed
standard: 2
model: haiku
effort: low
root: rc5-full-detail-every-day
checked: fable 2026-11-10
---

**What.** M7-01 asks that a town's year run in under two minutes, that the new-game load (including the opening) fit a short loading screen, and that the game run on a minimum PC. The year-time half is held elsewhere; the load time and the memory on a minimum PC have never been measured. This item measures them, then sets targets from Steam's hardware survey.

**Cause.** Measured: seed m7b, Long Hill, Connecticut (0943580), the dense town, and seed m7c-1794392818, Enterprise, Kansas (2021425), plus seed m7d-1794392818, Petersville, Indiana (1859400), small towns. Main c75090ef, a 4-core container with 15 GB. `npm run speed:year -- --seed <s> --years 1` measured the build and one year, with the process tree's resident memory polled every 2 seconds for its peak. `npm run bench` measured the new game the player waits for, the POST `/api/newlife?seed=<s>&placeKey=<key>`. Figures by town (Long Hill / Enterprise / Petersville):

- Build: 19.1 s / 6.7 s / 4.8 s.
- New game in the bench: 21.0 s / 5.7 s / not run.
- One year: 114.6 s / 42.2 s / 28.1 s.
- Peak memory over the year: 3.80 GB / 2.18 GB / 2.21 GB.
- Heap after the year: 1.01 GB / 0.77 GB / 0.71 GB.
- The bench process after a new game: about 1.7 GB in both towns run.

Targets come from Steam's Hardware and Software Survey for October 2026 (store.steampowered.com/hwsurvey, fetched Nov 11, 2026). System RAM: 16 GB is the most common size (41.42%) and 32 GB next (37.06%); 8 GB or more covers about 98.6% of machines, while 8 GB itself is 7.52% and 4 GB is 1.35%. The most common physical CPU counts are 8 (28.68%), 6 (27.29%) and 4 (12.36%). So a 4-core, 8 GB machine is a minimum PC most players exceed, and the game's 3.8 GB dense-town peak fits it with room for the system. Nothing here is a defect; the item only lacked these numbers.

**Fix.** Write the targets into docs/roadmap/later-specs-draft.md under M7-01's 'Passes when':

- The minimum PC is 4 physical cores and 8 GB (Steam survey, October 2026).
- On it, the new game loads in under 30 seconds in the densest town, and peak memory over a year stays under 4 GB (half of 8 GB).
- The reference machine is a 4-core container like this one, timed with the commands above, one process at a time; no separate hardware is bought.

Proposed for the CTO: drop the 'reference minimum-spec machine' step as its own work, since the container stands in for it. When early-access preparation comes, the timing becomes one line in the speed checks.

**Time box.** 1 hour for one Haiku session to write the targets into the spec and rerun the two towns once. When it runs out, write what was measured and stop.

**Rules.** Speed (AGENTS.md, owner Oct 29): a country's year under two minutes and no slower than 20% over base. Spec approved by the owner Oct 12. Research before building: the targets come from a fetched hardware survey and calibrate, they never decide an outcome.

**Done when.** A second session runs `npm run speed:year -- --seed m7b --years 1` (the drawn place Long Hill, Connecticut) and one fresh seed on a 4-core machine, and starts a new game in the bench on each. It sees the new-game time, the year and the peak memory printed beside the targets in docs/roadmap/later-specs-draft.md, each under its target.

**Waits on.** Early-access preparation (the roadmap schedule).

**Files.** docs/roadmap/later-specs-draft.md, scripts/speed-years/run.ts

**Notes.** Priority 3 until scheduled. Verify how much is built before starting. Oct 23: blocked-on was empty; set to the same not-scheduled reason as the other M7 items. #5364 (claude/m7-speed) is a note-only split proposal.

Split Oct 20, 2026 (claude/m7-speed). Measured on a 4-core container, `npm run speed:year -- --exclusive`: seed m7a, Discovery Harbor, Hawaii, builds in 10 seconds and runs a year in 52; seed m7b, Long Hill, Connecticut, builds in 33 to 36 seconds and runs a year in 194 to 214 (over the 120-second limit). The profile of the 251-second year is flat: garbage collection 52 seconds, then 3 to 6 seconds each for makeIsoDate, countedFollowers, releaseResidentHousehold, postCashJournal and others. Parts: `core-speed-year-over-limit-dense-town` (the umbrella bug, waits on its parts), `core-speed-gc-churn`, `core-speed-date-parse`, `core-speed-press-counted-followers`. Still unmeasured and unsplit: the new-game load against a short loading screen (33 to 36 seconds in the dense town) and the memory on a minimum PC (no peak figure here; `/usr/bin/time` is absent in this container), and the Steam hardware survey targets the item names.

Sent back 2026-10-23 from PR #5364 (branch claude/m7-speed): the first-line bare item ID would auto-complete the performance umbrella even though this is only a profile/Notes update and load/memory acceptance is explicitly unmeasured; retain the umbrella open and use a bounded evidence table; finish on that branch, merge main into it first.

Sent back 2026-10-24 from PR #5364 (branch claude/m7-speed): reporting scope corrected, but the Notes-only diff has no docs/release/changes declaration; add impact:none and keep the unfinished umbrella open; finish on that branch, merge main into it first.

Cause found (Nov 11, 2026, cause finder for Fable B): load, year and peak memory measured in a dense town and two small ones, and the targets drawn from the October 2026 Steam survey. The dense town fits a 4-core, 8 GB machine.

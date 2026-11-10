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
model: sonnet
effort: low
root: rc5-full-detail-every-day
checked: fable 2026-11-10
---

**What.** M7-01 asks that a town's year run in under two minutes, that the new-game load (including the opening) fit a short loading screen, and that the game run on a minimum PC. The year-time half is held elsewhere; the load time and the memory on a minimum PC have never been measured. This item measures them, then sets targets from Steam's hardware survey.

**Cause.** Needs cause. Looked at: the item and its Oct 20 Notes. The year time is measured (52 seconds and 194 to 214 seconds) and is held by AGENTS.md Speed and core-speed-year-over-limit-dense-town (done); the new-game load (33 to 36 seconds in the dense town) against a short loading screen and the peak memory on a minimum PC were never measured, and no source for the targets (the Steam hardware survey) was fetched.

**Fix.** None until the cause is found.

**Time box.** 3 hours for one Sonnet session: measure the load time and the peak memory in two drawn places and write the numbers in the item. When it runs out, write what was measured and stop.

**Rules.** Speed (AGENTS.md, owner Oct 29): a country's year under two minutes and no slower than 20% over base. Spec approved by the owner Oct 12. Research before building: the targets come from a fetched hardware survey and calibrate, they never decide an outcome.

**Done when.** Once the cause is found, a second session measures, in a drawn dense town and a drawn small town (places and seeds named), the new-game load time and the peak memory of a year on a reference minimum-spec machine, and sees the figures printed beside the Steam hardware survey's median PC as figures to report.

**Waits on.** Early-access preparation (the roadmap schedule).

**Files.** docs/roadmap/later-specs-draft.md, scripts/speed-years/run.ts

**Notes.** Priority 3 until scheduled. Verify how much is built before starting. Oct 23: blocked-on was empty; set to the same not-scheduled reason as the other M7 items. #5364 (claude/m7-speed) is a note-only split proposal.

Split Oct 20, 2026 (claude/m7-speed). Measured on a 4-core container, `npm run speed:year -- --exclusive`: seed m7a, Discovery Harbor, Hawaii, builds in 10 seconds and runs a year in 52; seed m7b, Long Hill, Connecticut, builds in 33 to 36 seconds and runs a year in 194 to 214 (over the 120-second limit). The profile of the 251-second year is flat: garbage collection 52 seconds, then 3 to 6 seconds each for makeIsoDate, countedFollowers, releaseResidentHousehold, postCashJournal and others. Parts: `core-speed-year-over-limit-dense-town` (the umbrella bug, waits on its parts), `core-speed-gc-churn`, `core-speed-date-parse`, `core-speed-press-counted-followers`. Still unmeasured and unsplit: the new-game load against a short loading screen (33 to 36 seconds in the dense town) and the memory on a minimum PC (no peak figure here; `/usr/bin/time` is absent in this container), and the Steam hardware survey targets the item names.

Sent back 2026-10-23 from PR #5364 (branch claude/m7-speed): the first-line bare item ID would auto-complete the performance umbrella even though this is only a profile/Notes update and load/memory acceptance is explicitly unmeasured; retain the umbrella open and use a bounded evidence table; finish on that branch, merge main into it first.

Sent back 2026-10-24 from PR #5364 (branch claude/m7-speed): reporting scope corrected, but the Notes-only diff has no docs/release/changes declaration; add impact:none and keep the unfinished umbrella open; finish on that branch, merge main into it first.

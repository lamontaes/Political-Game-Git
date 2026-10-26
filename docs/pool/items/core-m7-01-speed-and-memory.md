---
id: core-m7-01-speed-and-memory
title: "M7-01 Speed and memory"
area: core
kind: feature
priority: 3
size: L
status: open
claimed-by:
pr:
blocked-on: not scheduled: a roadmap milestone at priority 3 until the weekly reschedule (AGENTS.md: saves and release work wait for early-access preparation); an L item is split by whoever claims it once scheduled
milestone: M7
source: "docs/roadmap/later-specs-draft.md M7-01"
claimed-at:
---

**What.** A town's year in under 2 minutes; the new-game load (including the opening) fits a short loading screen; it runs on a minimum PC. (Owner: OPUS-CORE.)

**Rules.** Spec approved by the owner Oct 12; AGENTS.md rules.

**Done when.** Measured on a reference minimum-spec machine, with targets set from Steam's hardware survey.

**Files.** see spec

**Notes.** Priority 3 until scheduled. Verify how much is built before starting. Oct 23: blocked-on was empty; set to the same not-scheduled reason as the other M7 items. #5364 (claude/m7-speed) is a note-only split proposal.

Split Oct 20, 2026 (claude/m7-speed). Measured on a 4-core container, `npm run speed:year -- --exclusive`: seed m7a, Discovery Harbor, Hawaii, builds in 10 seconds and runs a year in 52; seed m7b, Long Hill, Connecticut, builds in 33 to 36 seconds and runs a year in 194 to 214 (over the 120-second limit). The profile of the 251-second year is flat: garbage collection 52 seconds, then 3 to 6 seconds each for makeIsoDate, countedFollowers, releaseResidentHousehold, postCashJournal and others. Parts: `core-speed-year-over-limit-dense-town` (the umbrella bug, waits on its parts), `core-speed-gc-churn`, `core-speed-date-parse`, `core-speed-press-counted-followers`. Still unmeasured and unsplit: the new-game load against a short loading screen (33 to 36 seconds in the dense town) and the memory on a minimum PC (no peak figure here; `/usr/bin/time` is absent in this container), and the Steam hardware survey targets the item names.

Sent back 2026-10-23 from PR #5364 (branch claude/m7-speed): the first-line bare item ID would auto-complete the performance umbrella even though this is only a profile/Notes update and load/memory acceptance is explicitly unmeasured; retain the umbrella open and use a bounded evidence table; finish on that branch, merge main into it first.

Sent back 2026-10-24 from PR #5364 (branch claude/m7-speed): reporting scope corrected, but the Notes-only diff has no docs/release/changes declaration; add impact:none and keep the unfinished umbrella open; finish on that branch, merge main into it first.

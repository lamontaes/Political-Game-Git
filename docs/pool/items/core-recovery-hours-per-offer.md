---
id: core-recovery-hours-per-offer
title: "Work recovery hours are a daily leisure total, not one offer's length"
area: core
kind: bug
priority: 3
size: S
status: claimed
claimed-by: claude/core-recovery-hours-per-offer
pr:
blocked-on:
source: "core-needs-core-172 triage, Oct 15"
claimed-at: 2026-10-16T13:37:14.083Z
---

**What.** `workWakingRecoveryHours` (5.16) is a day's leisure total used as the length of one recovery offer (`SG-P8-work-time-reserve`). Set it to the length of one offer and keep the total as a separate figure.

**Rules.** Every number is SOURCED, ESTIMATED or TUNABLE with a spread.

**Done when.** A test shows a worker's day in a drawn place using the per-offer length and the time-use check (scripts/core2-year/time-use.ts) still printing the same leisure share, with the stopgap resolved and the parameter row named.

**Files.** src/core2/data/parameters.json, src/core2/modules/people.ts

**Notes.** core.md line 194, checked Oct 15.

Looked at Oct 16 (claude/recovery-hours), not changed. Measured on main with `scripts/core2-year/time-use.ts time-use-a 2025-03-01` (Dargan, Maryland, 66 full people 15+, 40 days; note its default end date 2021-03-01 predates the 2025 start and throws "Core advance cannot move backward", so pass a date): rest is 65.9 acts per 100 person-days, ahead of care (47.8), contact (37.2) and scheduled work (25.1). A person can act more than once a day, and `offer.effortHours` for rest is `workWakingRecoveryHours` (5.16, the ATUS daily leisure total) while the other acts take their own hours (contact 1.92, work 8) out of `discretionaryHours`. Shrinking the rest offer to one sitting would let people rest several times a day and change how rest competes with contact and care for the rest of the evening; the printed time-use report has no leisure-share line to hold equal, so the "same share" check cannot be run as written. To build it: add a leisure-hours-per-day line to time-use.ts first (rest acts times their length over person-days, against ATUS 5.16), pick the length of one sitting from ATUS participant durations (the research file lists weekday 4.60 and weekend 6.48 totals but no per-episode length), then lower the parameter and show the leisure line unchanged and the care and contact lines moving only as far as the freed hours explain.

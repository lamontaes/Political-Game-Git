---
id: core-recovery-hours-per-offer
title: "Work recovery hours are a daily leisure total, not one offer's length"
area: core
kind: bug
priority: 3
size: S
status: in-pr
claimed-by: claude/time-use-leisure-line
pr: #5077
blocked-on:
source: "core-needs-core-172 triage, Oct 15"
claimed-at: 2026-10-19T18:19:20.775Z
---

**What.** `workWakingRecoveryHours` (5.16) is a day's leisure total used as the length of one recovery offer (`SG-P8-work-time-reserve`). Set it to the length of one offer and keep the total as a separate figure.

**Rules.** Every number is SOURCED, ESTIMATED or TUNABLE with a spread.

**Done when.** A test shows a worker's day in a drawn place using the per-offer length and the time-use check (scripts/core2-year/time-use.ts) still printing the same leisure share, with the stopgap resolved and the parameter row named.

**Files.** src/core2/data/parameters.json, src/core2/modules/people.ts

**Notes.** core.md line 194, checked Oct 15.

Looked at Oct 16 (claude/recovery-hours), not changed. Measured on main with `scripts/core2-year/time-use.ts time-use-a 2025-03-01` (Dargan, Maryland, 66 full people 15+, 40 days; note its default end date 2021-03-01 predates the 2025 start and throws "Core advance cannot move backward", so pass a date): rest is 65.9 acts per 100 person-days, ahead of care (47.8), contact (37.2) and scheduled work (25.1). A person can act more than once a day, and `offer.effortHours` for rest is `workWakingRecoveryHours` (5.16, the ATUS daily leisure total) while the other acts take their own hours (contact 1.92, work 8) out of `discretionaryHours`. Shrinking the rest offer to one sitting would let people rest several times a day and change how rest competes with contact and care for the rest of the evening; the printed time-use report has no leisure-share line to hold equal, so the "same share" check cannot be run as written. To build it: add a leisure-hours-per-day line to time-use.ts first (rest acts times their length over person-days, against ATUS 5.16), pick the length of one sitting from ATUS participant durations (the research file lists weekday 4.60 and weekend 6.48 totals but no per-episode length), then lower the parameter and show the leisure line unchanged and the care and contact lines moving only as far as the freed hours explain.

Oct 19 (claude/time-use-leisure-line): step one of the recipe above is built. scripts/core2-year/time-use.ts now prints a leisure-hours-a-day line (rest acts x workWakingRecoveryHours, per person-day). Baseline on main: Dargan, Maryland, seed time-use-a, 90 days, 66 full people 15+: 3.72 h a day against ATUS 5.16. Still to do: pick one sitting length from ATUS participant durations, lower the parameter, and show this line unchanged (acts rise as the length falls) with care and contact moving only as far as the freed hours explain. Re-open the item after this merges.

Measured Oct 19 (claude, same branch, nothing in the game changed): lowering `workWakingRecoveryHours` does not raise the number of rest acts enough to keep the leisure share, so the parameter cannot be shortened to "one sitting" on its own. Dargan, Maryland, seed time-use-a, 90 days, the new leisure line (rest acts x length, per person-day): at 5.16 h each, 72.2 rest acts per 100 person-days and 3.72 leisure hours a day; at 2.58 h, 76.3 acts and 1.97 hours; at 1.72 h, 77.1 acts and 1.33 hours. Rest acts rise only 7 percent while the length falls by two thirds, so leisure falls with the length (ATUS: 5.16). Work (64.8 percent), socializing (32.5 to 32.2) and caring (50.4 to 50.2) barely move. So the item's done-when ("the same leisure share") cannot be met by the parameter change alone: with the offer valid only while its length fits the person's free hours (life.ts lines 331 to 339), a shorter rest is offered more often yet the chooser took it only 7 percent more often. Traced: src/core2/free-block.ts fills each day "best act first: at most one act per need", so a person rests at most once a day whatever the rest act's length. In that planner the rest act is the day's leisure, which is exactly what the parameter says ("the rest act stands for an evening of leisure", CTO Oct 10), and the item's premise (one offer shorter than the day's total) conflicts with the planner's design. Two ways out, the Core area's call: (1) keep the length as the day's leisure and rename the parameter `restDayHours` so no one reads it as one sitting, closing this item; or (2) let the planner offer rest again in the same day (change `planFreeTime`, then pick the per-sitting length from ATUS participant durations, which the research file lacks) and show the leisure line holding. The measurement above is the evidence for (1).

Oct 19 (claude/rest-day-hours): took way (1), the premise correction. `workWakingRecoveryHours` is renamed `restDayHours` in parameters.json, work.json, the calibration targets, player-v1.test.ts and the time-use report, and its text now says one rest act is the whole day's leisure (the planner takes at most one act per need per day). The value stays 5.16 and nothing in play changes. Way (2), repeated rest in a day with a per-sitting length, stays open as a new feature if the Core area wants it; it needs the ATUS participant durations.

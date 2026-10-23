---
id: office-pay-through-the-payroll-and-per-diem
title: "Pay through the payroll, and per diem from each state's data (cited)."
area: office
kind: feature
priority: 2
status: done
claimed-by: claude/office-pay-per-diem
pr: #4546
blocked-on:
milestone:
source: "docs/archive/2026-10-23/coordination/OFFICE-STATE.md line 22 (unchecked checklist line)"
claimed-at: 2026-10-16T02:40:32.403Z
---

**What.** A state legislator's pay and per diem are not paid through the payroll from each state's data. Pay the base salary through the payroll as a seat job and pay per diem for session days from a cited state-by-state table (`src/core2/data/office-day/state-legislator-per-diem.json` exists; check it covers all 56 places and every row cites its source). The player would notice his state legislator pay arriving on the schedule the state sets and per diem appearing for the days he sat.

**Rules.** One rule, all 56 places: pay and per diem come from data for all 56 places, with no state named in code; Research before building: every rate cites its statute or comptroller schedule, tagged SOURCED or ESTIMATED with spread; Estimate, never UNKNOWN: a missing state's rate starts from the real average marked ESTIMATED, never UNKNOWN; An effect is a read, not a record: the treasury pays what the seat's pay rows and the days sat say, read at pay time; The chain is the acceptance: follow one per diem dollar from the treasury to the member's cash and a household bill; No dice: pay follows days attended and the law, not a roll; One model, two tiers: state legislators the player does not meet are paid by the same rule at their group's count.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): a state legislator's year shows monthly pay through the payroll and per diem for each session day (payment ids named), and `tests` check that every one of the 56 places has a cited row. A test beside `src/core2/office-day-pay.ts` tests. The owner plays it: reads his state pay and per diem in his account.

**Files.** src/core2/office-day-pay.ts, src/core2/office-day-state.ts, src/core2/modules/official-pay.ts, src/core2/data/office-day/state-legislator-per-diem.json

**Notes.** Checklist line from OFFICE-STATE.md; verify against main before starting.

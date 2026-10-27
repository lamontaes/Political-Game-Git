---
id: traits-accept-appointment-vacancy-proof
title: "Show offices.accept-appointment in a played year that holds a local vacancy, by record id"
area: people
kind: wiring
priority: 3
size: S
status: done
claimed-by:
pr: #6033
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** offices.accept-appointment (a person weighing a local post offered by appointment, src/core2/modules/offices.ts fillVacancy) runs only when a city, county or township seat falls vacant, its vacancy rule appoints, and no named successor is given. A vacancy needs the official to die or move away, which a one-year window in a small town rarely holds, so the trait audit reports it silent (data/content/trait-decision-gaps.json). Find a drawn place and year that hold such a vacancy (scan seeds for a seat-vacated record on a local seat with an appointing rule) and run the audit there, so the matrix shows its calls with the decision's record id.

**Rules.** No dice. One rule, all 56 places: draw places from all 56 and name the seed; never force the vacancy in the proof (a fixture proves edge cases only). Never loosen a check.

**Done when.** scripts/traits/trait-wiring-audit.ts with TRAIT_AUDIT_RECORDS=1 on one year of buildBenchWorld in a drawn place whose year holds a local vacancy filled by appointment, seed named, shows offices.accept-appointment with calls above zero and a weighed record id, and its gap row is removed.

**Files.** scripts/traits/trait-wiring-audit.ts, data/content/trait-decision-gaps.json

**Notes.** Filed Oct 25 by the traits lead from the never-run send-back (PR 5886).

Sent back 2026-10-25 from PR #6033 (branch claude/traits-accept-appointment-proof): explicit parent #6031 remains open/unmerged and itself stacks on #5886; merge/review parent features first, then integrate main and rerun vacancy-proof audit and gate; finish on that branch, merge main into it first.

Sent back 2026-10-26 from PR #6033 (branch claude/traits-accept-appointment-proof): parent #6031 is merged and integration clean, but Done when requires a weighed acceptance record; body substitutes took-office and audit matches arbitrary same-actor/day events rather than the decision; retain and verify actual decision identity/reasons in played vacancy proof, then finish on that branch and merge main first.

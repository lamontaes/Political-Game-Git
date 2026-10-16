---
id: office-proof
title: "Proof:"
area: office
kind: feature
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "docs/coordination/OFFICE-STATE.md line 24 (unchecked checklist line)"
---

**What.** Checked against main on Oct 16: PARTLY. `scripts/office-day-state/year.ts` runs a governor and a member for a year in one place; it is not a ten-day record per role, and no test imports the state office day. Speed was measured at 3.0% to 7.3% slower than base. Next: A ten-day transcript for a state legislator and a governor in a newly drawn state, with each day's entries and result record ids, and any defect filed as a pool item. The player would notice the act on the politics screen as a choice among people, never a form.

**Rules.** One rule, all 56 places: the place is drawn from all 56 and the seed named; Wire to the world: each day moves votes, money or people in a generated world; The chain is the acceptance: follow one act from the day to a bill, a payment or a person; No dice: no scripted outcomes; the engines decide; Speed: measure the office day before and after against the 20% limit; Ask why: each odd result gets a recorded cause by file and line, or 'not found'; Look before you ask: check OFFICE-STATE.md and SESSION-C.md first so nothing is redone.

**Done when.** In a drawn state and seed (named in the PR body) the script output lists ten days per role with every entry and result record id, and a new `src/core2/office-day-state.test.ts` covers one day of each; defects found are pool items. The owner plays it: A ten-day transcript for a state legislator and a governor in a newly drawn state, with each day's entries and result record ids, and any defect filed.

**Files.** src/core2/office-day-state.ts, src/core2/modules/office-day.ts, scripts/core2-year/, docs/coordination/OFFICE-STATE.md

**Notes.** Checklist line from OFFICE-STATE.md; verify against main before starting.

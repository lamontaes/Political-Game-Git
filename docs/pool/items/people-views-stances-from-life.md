---
id: people-views-stances-from-life
title: "A person's stance on a question comes from their own life: tenure, income, work, health plan, young children, a government job (cut 1 of 5)"
area: people
kind: feature
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: claude/project-thread-hjvzia
pr: #9162
after:
blocked-on:
root: design-one-model-two-tiers
lead: views
model: opus
effort: medium
source: owner, Nov 14 06:26Z (dispose of the 206 stopgaps; build the simulation so it simulates them), Account lead's ruling on SG-GOV-views-stand-in
checked: claude 2026-11-14
---

**What.** Every voter's view on every issue was their lean times the issue's left-right axis (plus faith and degree on eight questions), so a renter and an owner with the same lean held the same view on rent. Seen: polls and the paper's read of where the town stands on a question, door answers and votes in every race; dev mode's Trace on a person.

**Cause.** Found in code: `viewOn` and `openingStance` in `src/core2/modules/views.ts` and `groupStance` in `src/core2/campaign-views.ts` read only lean, faith, degree and what was heard; `countedStanceProfile` was kept for the whole world, so a counted resident's view never moved with their life (`SG-GOV-views-stand-in`).

**Fix.** A life term (`src/core2/life-stakes.ts`, rule in `life-stake-rule.ts`, sizes in `src/core2/data/views/stakes.json`): six facts read from the records both tiers keep (a lease or tenure, the household's national income fifth, work at 18 to 64, a private plan at 18 to 64, a child under 6 at home, a government employer), each against the nation's average, times a per-question size, times how much the person weighs their own stake (`views.own-stake` in the shared decision table). A fact the records do not hold (a relative far away, tenure where no homes are kept) sits at the national average. Full people read it each day; counted residents each month or when their household's record changes. Cut 1 covers fifteen questions (housing, the wage floor, Medicaid, preschool, family leave, public bargaining, the teacher floor, two taxes). Cut 2: the stance listener fires when a life change moves a stance. Cut 3: budget lines (retires `SG-GOV-budget-line-stance-lean-only`). Cut 4: every other question, then `SG-GOV-views-stand-in` resolves. Cut 5: officials outside the town, ballot measures and recalls (`publicSupport`) read the same term.

**Time box.** 6 hours, Opus.

**Rules.** No dice: traits weigh the stake; facts are records. One model, two tiers: one rule, facts from each tier's records, and a counted resident filled in keeps the facts their household gave them. Estimate, never unknown: a fact not held sits at the national average. Speed: year 1 at three places, with and without, in the PR.

**Done when.** `src/core2/life-stakes.test.ts` passes at its pinned places (renters and owners part on rent and the property-tax cap; a filled-in resident keeps their facts; a lost job moves a full person on the Medicaid work requirement). A second session, on main in a drawn place it names with its seed, opens dev mode's Trace on a renter and an owner and sees their stances on rent stabilization differ by the life term, and sees a person who lost work move on the work requirement.

**Waits on.** Nothing.

**Files.** src/core2/life-stakes.ts, src/core2/life-stake-rule.ts, src/core2/life-plan-readers.ts, src/core2/data/views/stakes.json, src/core2/modules/views.ts, src/core2/campaign-views.ts, src/core2/modules/coverage.ts, data/content/trait-decisions.json

**Notes.** Nov 14 (claude, thread "Build voters' views from their lives"): found while checking the counted and filled-in facts agree that a filled-in retiree's retirement award is not a finance contract, so `fullHouseholdIncomes` reads their income without it (Marshfield MA 2538820, world seed 75d9b7ad...; person_ea440ca012abcbcc read $33,156 counted, $0 filled in). Evidence added to `core-finance-contracts-vs-obligations-part-2-retirement-claims`, whose fix (the fill-in re-entry as a finance contract) closes it.

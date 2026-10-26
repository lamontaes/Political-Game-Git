---
id: laws-nine-links-health-schools-eight
title: "Eight of the twelve health, assistance and schools laws pass all nine wiring links in a played year (three budget lines and vouchers wait)"
area: laws
lead: laws
kind: wiring
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: laws lead, Oct 26
claimed-at:
---

**What.** A bounded part of `laws-nine-links-health-schools`. Eight of the family's twelve laws grade wired on all nine links on the law checker that credits a law only with its own payment: medicaid-match, expand-medicaid-eligibility, medicaid-work-requirement, work-requirement-for-assistance, universal-preschool, snap-maximum, budget-line:welfareAndMedicaid and raise-teacher-minimum-salary. The family item stays open for four. The healthAndHospitals, schools and higherEducation budget lines are cited by the payments they fund but pay nothing under their own law id; they wait for the treasury change in PR #5669, which pays each law's share of a line under the law's own id. Public funds for private schooling reached nobody in Prescott, Michigan, so it waits for a place where a private school and an eligible family both exist at the opening.

**Rules.** An effect is a read, not a record. The chain is the acceptance: each law is followed to a named payer, payee and journal id with its control-world amount. A registered stopgap never counts. Eligibility is decided from the opening records before play, never by redrawing after play, and a missing applied record fails the test.

**Done when.** In a played year (`buildBenchWorld`, every module installed) in places drawn from all 56 with seeds the builder did not choose, named in the PR body, `scripts/law-wiring/check.ts` and `scripts/law-wiring/matrix.ts` grade each of the eight laws above wired on all nine links in `docs/reports/law-wiring-matrix.json`, and the family test names, for each of them, its `lawApplied` record id, the journal entry of its money and the person, household or organization reached. **On screen.** Nothing yet.

**Files.** scripts/law-wiring/check.ts, src/core2/law-wiring-health-schools.test.ts, src/core2/law-reach/group-b-money.ts, src/core2/world-poverty.ts

**Notes.** Laws lead, Oct 26. PR #6026 moves to this item; `laws-nine-links-health-schools` stays open for the three lines and vouchers.

Merger 2: Sent back 2026-10-26 from PR #6026 (branch claude/laws-nine-links-health-schools), checked author348daf28e1bde98298068a130aee2adc64479ecb: the first Done-when row counts SNAP maximum as wired even though unwired.json611-614 and SG-WEB-unread-household-food-insecurity explicitly say its food-insecurity factor has no production reader or changed person/household/organization record; matrix2200-2201 credits monthly ledger rows only, contrary to this item Rules19 and Done-when21. Complete the reader/generated-world record proof or route a genuinely completed smaller slice while this item and the four-law remainder stay OPEN; preserve the honest unread row/stopgap, finish on that branch and merge main first. Code merged cleanly; allowed registry/generated-report conflicts were not the return reason. No local green/runtime-failure claim. Exact return: https://github.com/lamontaes/Political-Game-Git/pull/6026#issuecomment-6420457298.

Fixer, Oct 26: the seven laws other than the SNAP maximum moved to `laws-nine-links-health-schools-seven` (PR #6026). This item stays open for the SNAP maximum, which needs an engine that reads `household.food-insecurity` (stopgap `SG-WEB-unread-household-food-insecurity`) and names a changed household record. Branch: claude/laws-nine-links-health-schools.

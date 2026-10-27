---
id: laws-nine-links-health-schools-six
title: "Six of the twelve health, assistance and schools laws pass all nine wiring links in a played year (the Medicaid expansion, SNAP maximum, three budget lines and vouchers wait)"
area: laws
lead: laws-effects
kind: wiring
priority: 1
size: S
status: in-pr
claimed-by:
pr: #6026
blocked-on:
source: laws lead, Oct 26
claimed-at:
---

**What.** A bounded part of `laws-nine-links-health-schools-eight`, the slice of it that is complete. Six of the family's twelve laws grade wired on all nine links on the law checker that credits a law only with its own payment and, since #6173, grades an outcome no engine reads as a stopgap: medicaid-match, medicaid-work-requirement, work-requirement-for-assistance, universal-preschool, budget-line:welfareAndMedicaid and raise-teacher-minimum-salary. The Medicaid expansion leaves the claim: its medical-debt link (medicaid-expansion-to-medical-debt) has no engine reader (SG-EW-HEALTH-medical-debt-reader), so its web cell grades partial. The SNAP maximum stays in `laws-nine-links-health-schools-eight`: its food-insecurity measure has no engine reader (`SG-WEB-unread-household-food-insecurity`), so its web link is a ledger row only. The family item stays open for the rest. The healthAndHospitals, schools and higherEducation budget lines are cited by the payments they fund but pay nothing under their own law id; they wait for the treasury change in PR #5669, which pays each law's share of a line under the law's own id. Public funds for private schooling reached nobody in Prescott, Michigan, so it waits for a place where a private school and an eligible family both exist at the opening.

**Rules.** An effect is a read, not a record. The chain is the acceptance: each law is followed to a named payer, payee and journal id with its control-world amount. A registered stopgap never counts. Eligibility is decided from the opening records before play, never by redrawing after play, and a missing applied record fails the test.

**Done when.** In a played year (`buildBenchWorld`, every module installed) in places drawn from all 56 with seeds the builder did not choose, named in the PR body, `scripts/law-wiring/check.ts` and `scripts/law-wiring/matrix.ts` grade each of the six laws above wired on all nine links in `docs/reports/law-wiring-matrix.json`, and the family test names, for each of them, its `lawApplied` record id, the journal entry of its money and the person, household or organization reached. **On screen.** Nothing yet.

**Files.** scripts/law-wiring/check.ts, src/core2/law-wiring-health-schools.test.ts, src/core2/law-reach/group-b-money.ts, src/core2/world-poverty.ts

**Notes.** Fixer, Oct 26: PR #6026 moves to this item after Merger 2's send-back (SNAP maximum credited wired from a ledger row with no reader). `laws-nine-links-health-schools-eight` and `laws-nine-links-health-schools` stay open.

Laws-effects lead, Oct 26 22:00 UTC: renamed from laws-nine-links-health-schools-seven on the branch, before it reached main. On main's checker after #6173 the Medicaid expansion grades partly (its medical-debt link has no reader), so six laws land; the expansion stays on the family item.

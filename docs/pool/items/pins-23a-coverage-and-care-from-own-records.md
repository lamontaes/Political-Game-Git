---
id: pins-23a-coverage-and-care-from-own-records
title: "Employer plans, premiums, the price of care and medical collections come from the town's own records"
area: world
kind: bug
priority: 1
size: L
status: in-pr
standard: 2
claimed-by: lives
pr: 9918
after:
blocked-on:
lead: lives
model: fable
effort: high
root: none
source: The CTO's LIFT THE PINS line on the crew's thread (#9747, comment 6936897718), family 23, pins 1 to 5, Nov 17, 2026
---

**What.** Every world gave 55 percent of its workers an employer health plan, charged every policyholder the same KFF 2024 dollars forever, set every town's medical bills to the Consumer Expenditure Survey's mean for its region, and sent 40.5 percent of every unpaid bill to collections. A town of large, well-paying employers and a town of small shops held plans at the same share, a town with more illness paid no more for care, and a household with nothing was sent to collections as often as one with plenty. The owner's order of Nov 17 is that everything comes from the simulation and nothing is pegged to a real number.
Seen: dev mode's Calendar, "Employer health plans today", read "Share who hold their own plan 55%" at every drawn place.

**Cause.** Found in code: `src/core2/modules/coverage.ts`, `holdersToday` (slots are `healthEmployerPolicyholderShare` times the workers) and `plansToday` (the premium is `healthWorkerContributionSingleAnnualUsd` or `...FamilyAnnualUsd`); `src/core2/medical-bills.ts`, `billMembers` (each member's care is divided by the town's average and priced at `annualOutOfPocketUsd` times the world's living-cost draw) and `collectionsShare` (`medicalCollectionsBaseShare` times the web's factor).

**Fix.** `holdersToday` weighs each worker twice from records the world keeps (`planScores`: the employer's offer from its staff and the job's pay against the plan's cost, the worker's take-up from their part of the premium against their pay); the town's plans are the sum of its workers' own shares. `setRate` sets the year's rate from the employer plans' own claims (the insurers' part of the care their members were billed, twelve months, a covered person, plus the load). `carePrices` prices a month of care from what the place's own hospitals and clinics pay their staff, and `billMembers` no longer divides by the town's average. `collectionsShare` weighs the household's income against the poverty guideline for its size. The five published levels and the survey table reads are deleted. The player sees it in dev mode's Calendar ("Employer health plans today": the offers, the plans, the year's rate and the claims behind it) and on a household's premium and medical bill in Money.

**Time box.** 4 hours, Fable high.

**Rules.** No dice: each worker's own records decide who holds a plan, the sum of shares how many. One model, two tiers: a counted worker is weighed by the full worker's rule, times the households the record stands for. Replace, never layer: the pinned rows and the survey reads are deleted in the same change. An effect is a read: the premium reads the bills' insurer parts, by record. Speed: a year stays within 20 percent of its base.

**Done when.**

- In a drawn place, Ackerman, Mississippi (seed e0e394393c353f1d), and at two more drawn places, the share of workers holding an employer plan differs between towns, and over a played year it moves with the town's own jobs and pay.
- The year's rate in January of the second year equals the employer plans' own claims a covered person over the months before it, times the load, by the rate row.
- `src/core2/coverage-from-own-records.test.ts` passes, and fails with the fixed share and the fixed premium put back.
- A second session opens dev mode's Calendar at a drawn place it chose and sees the offers, the plans, the rate year and the claims behind the rate, and sees them differ at a second drawn place.

**Waits on.** Nothing.

**Files.** `src/core2/modules/coverage.ts`, `src/core2/medical-bills.ts`, `src/core2/data/parameters.json`, `src/core2/data/health/medical-bills.json`, `src/core2/coverage-from-own-records.test.ts`, `src/core2/health-coverage-counted.test.ts`, `src/bench/dev-views/health-plans.ts`, `src/bench/ui/dev-health-plans.mjs`, `docs/design/daily-register.md`.

**Notes.** Nov 17 (Lives): the premium falls to what this world's care bills support. The bills engine prices the survey's medical services line only (stopgap SG-HEALTH-medical-bill-shape), so a covered person costs the plans about $120 to $200 a month at the drawn places measured, where the survey's premium was $746.

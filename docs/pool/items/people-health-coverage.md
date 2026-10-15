---
id: people-health-coverage
title: "Health coverage on people, so Medicaid expansion and its work requirement change who is covered"
area: people
kind: feature
priority: 2
size: L
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "found while building laws-family-assistance-health; stopgap SG-GOV-REACH-B-medicaid-coverage"
---

**What.** People have no health coverage and medical spending does not read a plan, so the Medicaid expansion and its work requirement are eligibility records only. Add a coverage record on named people and counted groups (employer plan, Medicaid, none), seeded at generation from survey rates by state and age, read by medical costs: an uninsured sick person pays more, a covered one less. Then the expansion marks adults 19 to 64 under 138% of the poverty line eligible and covers them, and the work requirement ends the coverage of those under 80 hours a month with no child under 14.

**Rules.** No dice; one model, two tiers; an effect is a read (the health engine's cost or care decision reads the coverage); numbers in the parameter table with sources.

**Done when.** In a one-year run of a drawn place, a named adult's coverage starts after the expansion, their medical bill is smaller, and the work requirement ends it; by record id.

**Files.** `src/core2/modules/health.ts`, `src/core2/law-reach/group-b.ts`, `src/core2/data/`.

**Notes.** The assistance half (SNAP-style benefit) is `gov-snap-program`; the work-requirement read for the welfare benefit is already in `group-b-work-requirement.ts`.

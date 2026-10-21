---
id: people-partnerships-counted-and-rates
title: "Counted people partner, separate and leave home by the same rule as full people, and a played year's totals fall within the CDC and ACS rates"
area: people
kind: feature
priority: 2
size: M
status: blocked
claimed-by:
pr:
blocked-on: spec: the item text is an empty TODO shell; the done-when must be written before it can be built (pool-todo-shells-need-spec)
after: people-partnerships-full-people-form,people-partnerships-full-people-end,people-leave-parents-home
source: added with npm run pool -- add
---

**What.** Counted people partner, separate and leave home by the same rule as full people, times their count, so the wider population's household mix turns over too. A played year's totals are then checked against the real rates, about six marriages and two to three divorces per thousand residents a year (CDC NCHS) and ACS marital events in the last year (B12503, B13010), as a check on totals only. A full person filled in from a counted household matches the household's recorded partner and home.

**Rules.** No dice: the outcome comes from ages, closeness, traits, money, housing and the law in force; real rates check totals and never pick one couple. One model, two tiers: counted people follow the same rule times their count. Wire to the world: a new household moves a dwelling, lease and cash by journal record.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place from all 56, seed named in the PR body) partnerships formed, ended and young adults who left home appear as records by id for both tiers, and their totals per thousand residents fall within the spread of the CDC and ACS rates. A test in src/core2/people-partnerships.test.ts names the place and seed and fails outside the spread.

**Files.** src/core2/modules/residents.ts, src/core2/modules/people.ts, src/core2/data/people/, src/core2/people-partnerships.test.ts

**Notes.** Split from people-partnerships-form-and-end (L) on Oct 19. Read docs/coordination/DECISION-REGISTER.md and OWNER-DECISIONS.md first for any ruling on how partnerships are shown.

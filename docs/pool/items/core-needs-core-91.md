---
id: core-needs-core-91
title: "Needs from other sessions listed in core.md (line 91): 11 lines"
area: core
kind: wiring
priority: 2
status: done
claimed-by: claude/core-needs-91
pr: #4494
blocked-on:
milestone:
source: 'docs/archive/2026-10-23/coordination/core.md "Needs from other sessions" (line 91)'
claimed-at: 2026-10-15T22:27:10.792Z
---

**What.** This list holds 11 requests from other sessions about the core, mostly reproducible crashes and slow spots found in generated worlds. Three places cannot build their world (no resident aged 17 in Freedom Acres, Arizona, Princeton, Arkansas and Danvers, Montana), a household filled in twice reuses a transfer id, a county assessor seat waited a year for a special election, and opening cash leaves 232 of 276 Kellogg, Idaho residents with nothing so no estate passes. Verify each line against main first, fix what still fails, and split any large line into its own pool item.

Lines (as of 2026-10-15, from the status file):

- **PEOPLE:** three places can't build their world: "No household of <place> holds a resident aged 17" (`src/core2/population.ts`, `buildPopulation`): Freedom Acres, Arizona; Princeton, Arkansas (seed 8fc1f5ee31df); Danvers, Montana (seed dcb535ed84b2). Reproduce: `npm run all-places -- --seed e6938a473362ad85 --only U
- **one-model-two-tiers (fill-in):** "Transfer id is empty or reused: fill-in:household_<id>:cash" (`accounts.ts` `transferSplit`), a household filled in twice: Sabattus, Maine (seed c304c28e0e3c, September 17, 2025); Minto, North Dakota (seed abadf61ae377, October 17, 2025).
- **OFFICE-LOCAL:** on January 1, 2026 the office day's job review ends a job from its daily hook ("A job ends before its day's work, from calendar work", Pluckemin, New Jersey, seed 52da7cdd6ca8) and starts one for an unrecorded person or employer ("A job start needs a recorded person and employer", Albuquerque, New M
- **GOV:** a county assessor seat in Homeland Park, South Carolina (seed fac7592153bb) has been awaiting a special election since April 26, 2025, and none was held or dated within the year.
- **PEOPLE (opening cash, `residents.ts`):** at the start of Kellogg, Idaho (seed f2303bbc5e60), only 44 of 276 residents hold any cash in their own account (the median is $0, and the 90th percentile is $702.89), so a resident's estate is nearly always empty and nothing passes by will or intestacy. The Survey of Consum
- **PEOPLE and WORLD (opening town port):** return the opening's people (names, traits, upbringing) and its jobs and pay as core records rather than writes into an old-engine world (`createCharacterHistoryContextPeople`; `ensureTownEmployment`). The core then retires the old world scaffolding from `population.ts`.
- **Owner of `residents.ts`:** `releaseResidentHousehold` loops over every counted flow (`rt.flows`) on each household fill-in or release; an index of flows by household and job would make it read only that household's flows. Year three of Kagman, Northern Mariana Islands (seed 31a4370993ef): about 7% of the profiled d
- **WORLD:** I guarded `amortize` in `src/core2/modules/housing.ts` so a paid-off mortgage doesn't end a payment already ended by the household leaving; keep or replace it.
- **PEOPLE:** renewal's counted births and moves (`births-counted.ts`, `applyCountedFlows`) take 1.0 second every 1st of the month in year three.
- **GOV:** the December legislative session takes 6 seconds, 3.5 of them in committee rosters and chamber votes (`leadership.ts` `committeeRoster`, `legislature.ts` `chamberVote`).
- **WORLD:** the jobs engine's monthly worker review takes 0.4 seconds a month. `src/core2/business-names.ts` (#4224) isn't in the typecheck project's file list (TS6307 on main).

**Rules.** One rule, all 56 places: every fix is checked in a drawn place and a failing seed, never one named town in logic. One model, two tiers: a filled-in household must match the counted records and be filled in once. Speed: the monthly counted flows and the December session timings must come down, measured on the same machine before and after. Estimate, never UNKNOWN: opening cash starts from the Survey of Consumer Finances average with a spread.

**Done when.** Each line shows either a passing run on its failing seed in a drawn place (the three build failures build, the double fill-in no longer reuses a transfer id, shown by record id) or a note that main already fixed it. The test in src/core2/accounts.test.ts and src/core2/population.test.ts pass for the fixed lines, and a one-year played world (buildBenchWorld) in Kellogg's seed shows an estate passing by will with a record id. The owner plays it: a death in a small town leaves an estate that someone inherits.

**Files.** src/core2/population.ts, src/core2/accounts.ts, src/core2/modules/residents.ts, src/core2/modules/housing.ts, src/core2/births-counted.ts, src/core2/modules/leadership.ts, docs/archive/2026-10-23/coordination/core.md

**Notes.** Overnight pool item 10: claim one list at a time. Verify.

**Checked and done Oct 15 (claude/core-needs-91).**

- The three places that could not build their world (Princeton, Arkansas, population 3; Danvers, Montana, population 6; Freedom Acres, Arizona) are fixed: the player's-cohort search was capped at the town's own household count and now has a floor (`cohortSearchMinimumHouseholds`). The test in `population-cohort.test.ts` draws a town of 10 people or fewer and failed 2 of 6 runs before the fix.
- The double fill-in transfer id (Sabattus, Maine; Minto, North Dakota), the January 1 job review errors (Pluckemin, New Jersey), and the Homeland Park, South Carolina assessor seat no longer reproduce on main: the same seeds run a full year without a crash and Homeland Park has no open vacancy.
- The `amortize` guard in `housing.ts` stays.
- `business-names.ts` is in the typecheck project (typecheck passes on main).
- Split into their own items: `core-opening-resident-cash`, `core-release-household-flow-index`, `core-counted-flows-monthly-speed`, `gov-december-session-speed`, `world-jobs-monthly-review-speed`.

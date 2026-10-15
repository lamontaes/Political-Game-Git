---
id: core-needs-core-91
title: "Needs from other sessions listed in core.md (line 91): 11 lines"
area: core
kind: wiring
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: 'docs/coordination/core.md "Needs from other sessions" (line 91)'
---

**What.** Each line below was a request one session made of another. The asking sessions are gone, so each is a wiring job for whoever claims it. Verify against main first; skip what is already built and split off an item for any line that is large.

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

**Rules.** Wire to the world; an effect is a read; nothing waits on another session (build the smallest registered stand-in).

**Done when.** Each line either built and read by another engine in a played year (record ids), or noted done on main. Update the status file.

**Files.** varies

**Notes.** Overnight pool item 10: claim one list at a time. Verify.

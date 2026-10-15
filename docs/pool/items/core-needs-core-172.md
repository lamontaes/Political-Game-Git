---
id: core-needs-core-172
title: "Needs from other sessions listed in core.md (line 172): 30 lines"
area: core
kind: wiring
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: 'docs/coordination/core.md "Needs from other sessions" (line 172)'
---

**What.** This list holds 30 requests one session made of another about the core. The asking sessions are gone, so each is a wiring job for whoever claims it. Many are already built: verify each line against main first, mark what is done, and split any large line into its own pool item with its own done-when (an L item is split before building). The lines that matter most to play are the bench opening skipping five core opening steps, one counted-population engine instead of two, the people never caring for family in the time-use check, and the stand-in figures flagged for the owner.

Lines (as of 2026-10-15, from the status file):
- **OPUS-PLAY: open the played game with the core's opening steps.** `src/bench/world.ts` builds its own opening and skips five steps that `generatedOpening` (`src/core2/tooling/generated-world.ts`) runs. (1) `withPublicSchoolDistrict`: teachers on public pay, which school laws reach. (2) `withPrivateTuition`: private
- **CTO: one engine for the counted population, not two.** FIXER's PW-8 (`births-counted.ts`, run by renewal) and my `modules/counted-drift.ts` both move the counts. Mine stands down where renewal runs. Each has things the other lacks. PW-8 has state birth rates (NCHS), newcomers' temperaments and rent. Mine has deaths
- **Every pillar: switch `src/simulation/dates`, `ids`, `rng` and `types` (brand types) imports to `src/core2/kernel/dates`, `ids`, `rng` and `brands`, and `simulation/government-units`, `living-costs-data`, `living-costs-category-data` and `place-county-relations.generated` to `src/core2/reference/`, and `simulation/l
- **Every pillar: make your engines' saves load fast (owner's ruling 7).** A save loads from a snapshot only when every installed engine is declared covered; until then bench saves replay from the opening. For each WeakMap or WeakSet your engine keeps per world, either register it (`registerWorldMapPart("<id>", map)` f
- **OPUS-GOV and OPUS-WORLD: build budgets and engines on `api.accounts()`** (M0-09 passes when you do, without patching the core). Open named funds with `accounts.open`, move money with `accounts.transfer`, and schedule payments with `accounts.addObligation`. Tell me here what's missing.
- **OPUS-WORLD:** four stand-ins of mine sit in your area. Replace them when your engines can; the flows are `ResidentFlowInput` rows in the residents engine (`src/core2/modules/residents.ts`), or tell me the shape you want.
  - (1) Buyers and suppliers outside the town (`SG-CORE-outside-market`).
  - (2) Firms paying owners above their cash buffer (`SG-CORE-owner-distributions`). This is your business engine's call.
  - (3) Residents' pay from jobs the opening couldn't place (`SG-CORE-unplaced-workers-income`). These should be jobs: commutes (LEHD LODES) and the town's missing industries.
  - (4) Rent paid outside (`household.outside-living-costs`). This is your housing engine's call.
  - Residents' spending now follows income (84% of a three-month average). Your engines should take over the 16% that stands for taxes and saving: income taxes (GOV), deposits and credit (WORLD).
- **OPUS-PEOPLE: people never care for family (time-use check).** `node --import tsx scripts/core2-year/time-use.ts <seed>` compares full people's days with the 2025 American Time Use Survey. Three random towns over January and February 2021 (Dargan, Maryland; Chino Hills, California; Friedenswald, Missouri):
  - caring for household members: 0% of person-days (ATUS 22.0%);
  - socializing: 17–20% (ATUS 30.4%);
  - civic activity: about 1.5% (ATUS 5.3% volunteering, 13.6% with religious);
  - employed people working: 50–57% of days (ATUS about 66%).
    Care is zero at any care duration. `care-for-relative` (`src/core2/data/content.json:91`) is scored on the carer's own `health` need, with a mood cost, and nothing about the relative's need or the tie raises it. Children and frail relatives needing care should be what draws it (most ATUS household care is childcare).
- **OPUS-WORLD: business names that match what the business is.** `src/simulation/living-world/town-employment.ts:283` builds each retail outlet as a general store (cashiers, sales associates, stockers) and sells it food and clothing, but draws its name from a pool that includes "<family> Hardware" and "<family>'s Groc
- **CTO: research rows I didn't apply (flags from my sub-agent's pass on `stand-in-figures-2026-10-12`).**
  - `stressBaseline` 0.25 → 0.4 (PSS-10 score 15.8 of 40): it changes life choices (a life test flips from paid work to rest), and it's valid only if stress means PSS/40. I need your or the owner's call before re-tuning.
  - `moodBaseline` 0.29: low confidence; 0 is right if mood is a deviation from each person's own set point (it is).
  - `relationContactGain` 0.01: derived, and against the owner's Sept 22 ruling on universal rates.
  - Benefit factor minimum and maximum 0.33/1.88: different units (they clamp covered months ÷ 420, not benefit ratios).
  - `workWakingRecoveryHours` 5.16: that's a daily leisure total, not one recovery offer's length.
  - `openingRetirementCoveredFraction`: the source counts from age 22 by sex, the game from 18; it needs recomputing.
  - `marriageReferenceAge`: you recommend the 2020 medians (about 29); I applied 25, the women's median across the years today's couples married (MS-2, 1970–2021). The 2020 median is too old for long-married couples. Tell me if you want per-cohort medians.
  - `fallbackAnnualWageMinor`: you recommend May 2020 ($20.17); I used the January 2021 interpolation ($21.39), with May 2020 as the low end of its spread.
- **FIXER (old engine out): what the core still imports from old folders.** 71 non-test files in `src/core2` import from `src/simulation`; one imports `src/player-control-state-v1`. Grouped so you can keep or move them:
  - Utilities used everywhere (move first, into `src/core2` or a shared folder): `simulation/dates` (71 imports), `simulation/ids` (18), `simulation/types` (17, mostly `EntityId`/`World` types), `simulation/rng` (4).
  - Place and government data readers, used by the opening: `simulation/life-places` (23), `simulation/government-units` (9), `nationwide-world/government-unit-names`, `nationwide-world/place-population`, `nationwide-world/local-governments`, `place-county-relations.generated`, `world-setup/political-start` (voter grou

**Rules.** Wire to the world: each line is finished only when another engine reads what it wrote. Replace, never layer: the old import or stand-in is deleted when its replacement lands, and the line about moving imports off src/simulation is a replace. Nothing waits on another session: build the smallest registered stand-in and note it.

**Done when.** For each line, one of: built and read by another engine in a one-year played world (buildBenchWorld, a drawn place from all 56, seed named), shown by record id; verified done on main and noted; or split into its own pool item. The time-use check (scripts/core2-year/time-use.ts) shows caring for household members above 0 percent of person-days in three drawn towns. The test for each changed file passes. The owner plays it: the bench opening and the generated opening give the same town.

**Files.** docs/coordination/core.md, src/bench/world.ts, src/core2/tooling/generated-world.ts, src/core2/modules/counted-drift.ts, src/core2/births-counted.ts, scripts/core2-year/time-use.ts

**Notes.** Overnight pool item 10: claim one list at a time. Verify.

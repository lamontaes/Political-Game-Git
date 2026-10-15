# M1-laws: which law applies, at every level

**Contract:** M1-01 in `docs/roadmap/features.json`. For a random place, tracked laws (minimum wage; income, sales and property taxes; major benefit amounts) match that place's real starting law at every level; a higher level's override wins where it legally does; a law that hasn't taken effect yet doesn't apply.

**Builder:** a new Codex session, CODEX-LAWS, at **high**: every later engine (taxes, budgets, jobs, housing, elections) reads law in force through this module.
**Finisher:** a new Claude session, **Sonnet at high**: the check is matching records against sourced law in random places.
**Branch:** `pool/M1-laws`, stacked on `pool/M0-core-pieces`. **Starts:** as soon as this work order is approved.
**Owns:** `src/core2/modules/laws.ts`, `src/core2/laws-*.ts`, `src/core2/data/laws/`, `data/research/laws/local-starting-law/`, and their tests. Read `M1-common.md` first.

## What exists

- **Old core:** law in force is worked out on every read from history, falling back to 2026 starting law: `src/simulation/governing/law-in-force.ts` (`lawInForce`, `startingLawInForce`, `startingLawTerms`, `startingLawScope`, `enactmentOperative`), the 12-level ranking in `src/simulation/law-hierarchy.ts`, effective dates in `src/simulation/governing/statute-effective-date.ts` and `src/simulation/legislative-effective-date.ts`, local taxing powers in `src/fiscal-authority/query.ts`, minimum wage in `src/simulation/minimum-wage.ts`, and tax law in `src/simulation/statutory-tax.ts`, `income-tax-withholding.ts`, `state-income-tax-law.ts` and `tax-policy.ts`.
- **Lifted rules** (`src/rules/laws` on `pool/P14-laws`, PR #3931): `lawInForceFromCandidates`, `governs`, `governingRank`, `lawLevelRank`, `outranks`, `ruleChangeInForce`, the `stateStatuteOperativeAt` kernel, `minimumWageSettingFromFacts`, `effectiveTaxPolicyFromFacts`, `taxAssessmentFromFacts`, `withholdingForPaycheckFromFacts`, `taxableWages`, `taxAt`, `stateIncomeTaxScheduleFromSingleFact` and `evaluateLawAmount` (which refuses a missing fact instead of using zero). RULES-2 is still lifting more on that branch; build on what's there and list what you lifted yourself.
- **Data in the repo:** `data/research/laws/starting-law-2026/` (59 questions, federal and state answers with citations and a `preempts` field; default effective-date rules in `metadata.json`); in `data/research/money/`: `minimum-wage-dated-matrix-2026.json` (56 places, dated phases), `state-income-tax-2026.json` (50 states and D.C., single filer only), `federal-income-tax-schedules.json` (IRS, 2026), `statutory-tax-rules.json`, `local-tax-authority-matrix.json` (50 states, estimated) and `public-programs-2026.json`.

## Research first

The test can't pass on today's data. Fill these gaps before building the module, with citations and recorded terms:

1. **State sales tax rates** for all 56, from each state's revenue department.
2. **Local sales tax:** for each state, the combined rate in a representative sample of its counties and cities (largest city, a mid-size city, a small town, an unincorporated area), from the state revenue department's rate tables; then an estimate with a spread for places not sampled.
3. **Property tax:** effective rates by county, from Census ACS median real estate taxes paid and median home value (both U.S. government), plus each state's assessment rules and caps from statute.
4. **Local income taxes** where a state allows them, from state and city tax agencies.
5. **Local minimum wages** (counties and cities with their own), from the city or county ordinance or the state labor department.
6. **State income tax** for married filers and the remaining 5 places, and each territory's income tax system from its own tax agency (Puerto Rico has its own code; several others mirror the federal code with local changes; record which and how).
7. **Major benefit amounts:** state unemployment weekly minimum and maximum (U.S. Department of Labor), SNAP maximums by household size (USDA), and the federal Medicaid match by state (the annual Federal Register notice). `public-programs-2026.json` has 49 of 56 match rates missing.
8. **Effective dates:** each state's default effective date for new laws and its emergency-clause rule, so the effective-date rules stop relying on stopgaps.

Store local findings under `data/research/laws/local-starting-law/`, one file per kind, keyed by place id, with the source, retrieval date and estimate flag on every row.

## Build

1. **Tables.** Register module `laws` with tables for law rows (place, level, series, terms, effective date, end date, source), each place's chain of levels (federal, state, county, city, special district where taxing), and enactments (empty at the start; M3 writes them). Index by place and series, and by effective date.
2. **Starting law.** At the opening, load the start date's real law for every level that covers the town, from the research above and the existing starting-law data. A law whose phase starts later is stored with its future date and doesn't apply yet.
3. **Law in force.** One call answers "what is the law on series S for this person, business or place on this date", walking the level chain with `lawInForceFromCandidates` and the hierarchy rules: a higher level's rule wins where it legally preempts, a floor (minimum wage) lets a lower level go higher, and a ceiling does the opposite, per each state's recorded doctrine. Lifted rules only; no second evaluator.
4. **Effective dates.** Put every dated phase on the module calendar. On its date, emit "law took effect" (public record) and update the in-force answer. For the minimum wage, on the effective date raise any job paying under the new floor through the work module's pay-change path. If that path doesn't exist, add it as a shared core change (see `M1-common.md`).
5. **Who it applies to.** An index from each person and business to the levels that cover them (by address and workplace), so a payroll or a purchase reads its law without a search.
6. **For later engines:** expose read calls for tax schedules, benefit amounts and landlord-tenant terms, so budgets (M1-07), housing (M1-05) and jobs (M1-04) read law from here rather than from data files.
7. **Bench:** a "law here" view of the player's town, every tracked series at every level, with its source and whether it is in force or pending.

## Placeholders to register

The shelf's 8 stopgaps carry over (for example, preemption by rank only). Anything researched as an estimate is labeled in data, not registered as a stopgap. The seeded pick of a school-facilities tax rate in `src/simulation/world-setup/state-tax-service-profiles.ts` doesn't come across; use the researched rate.

## Out of scope

Passing new laws and their consequences (M3), taxes actually collected and budgets (M1-07 work orders), courts, and `src/rules/laws` itself (RULES-2).

## Hand-off

The finisher draws three places from all 56, including at least one territory, and checks every tracked series at every level against the cited source; checks one preemption case and one pending phase; and confirms the minimum-wage raise lands on its date for a named worker.

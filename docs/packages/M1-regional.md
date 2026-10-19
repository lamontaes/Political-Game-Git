# M1-regional: state and metro economies

**Contract:** M1-03 in `docs/roadmap/features.json`. In a year, two randomly drawn states diverge plausibly in jobs and wages; a town's prices and pay follow its region; each state's and metro's starting figures match real data.

**Builder:** a new Codex session, CODEX-REGIONAL, at **medium**: a data-driven layer on the national module, with its shape set here.
**Finisher:** a new Claude session, **Sonnet at high**: the check is against real ranges.
**Branch:** `pool/M1-regional`, stacked on `pool/M1-macro`. **Starts:** when M1-macro's monthly step and condition rows are on its branch.
**Owns:** `src/core2/modules/regional.ts`, `src/core2/regional-*.ts`, `src/core2/data/regional/`, `data/research/regional/`, and their tests. Read `M1-common.md` first.

## What it is

Each state has its own economy, split into its one or two largest metro areas and the rest of the state (owner, Oct 10). Each region has an industry mix and moves with the nation by that mix, plus its own persistent gap. A town belongs to the region its county falls in. That's about 170 regions nationwide, stepped monthly.

## What exists

- **Old core:** no state or metro economy; only a per-jurisdiction gap on top of the national figures (`stepLocalMonth` in `src/simulation/macro-economy/kernel.ts`). Industry mix and pay come from `src/simulation/living-world/town-employment.ts` (County Business Patterns sector shares), `town-pay.ts` (OEWS wages by occupation and area) and `town-rent.ts` (`rentPriceLevel`).
- **Lifted rules** (`src/rules/economy`): `town-pay.ts`, `town-employment-mix.ts`, `employment-mix.ts`, `town-measures.ts`. 25 of 41 relevant functions are listed as not liftable; port the math you need.
- **New core:** the opening already uses CBP sector stock and OEWS (`src/core2/opening-employment.ts`); condition rows are per place.
- **Data in the repo** (`data/source/`): BLS LAUS (states, metros and cities over 25,000; 50 states, D.C. and Puerto Rico; 2024 on), BEA regional income and price parities (states and metros; 2019, 2023, 2024), OEWS May 2025 (530 metro and nonmetro areas; no American Samoa or Northern Marianas), CBP 2023 county sector mix (50 states and D.C. only), and CBSA 2023 delineations (which counties make up each metro).

## Research first

1. **History to move by:** state and metro employment by industry (BLS CES state and area, QCEW), state output by industry (BEA), LAUS unemployment history to at least 2000.
2. **How each industry follows the nation:** answer `docs/research/requests/local-jobs-react-to-industry-shocks.json` and `unemployment-return-to-normal.json` (how long a state's unemployment gap lasts).
3. **Territories:** Puerto Rico from its own labor and planning statistics where the U.S. tables stop; Guam, the U.S. Virgin Islands, American Samoa and the Northern Marianas from their governments' published labor statistics or BLS where it covers them, and otherwise labeled estimates from the nearest comparable economy.

## Build

1. **Regions from data.** Pick each state's one or two largest metros by population from the CBSA and Census tables (two when the second is large enough to differ in mix; record the rule), plus the rest of the state. No region is named in code.
2. **Tables.** Register module `regional`: regions (id, state, kind, member counties), their monthly series (jobs by industry, unemployment, average pay, price level) and their starting figures with sources.
3. **Monthly step** after the national step: each region's industries move with the national cycle by their researched sensitivity, plus the region's own gap, which fades at the researched pace. Public purchases from M1-07 and large local closures from M1-08 feed in when they land (registered stopgaps until then).
4. **Conditions for the town.** Combine national and regional factors into the town's dated condition rows (price, wage, demand), replacing M1-macro's national-only rows for places in that region. Pay for new hires (M1-04) and rents (M1-05) read the region's level.
5. **Bench:** a state panel showing the town's region beside its state and the nation, with sources.

## The test, made exact

"Diverge plausibly" means: over one year, two randomly drawn states' job growth and pay growth differ, and each stays inside the real spread of one-year state changes over 2000 to the latest year; a state heavy in a hard-hit industry falls further in a national downturn. Starting figures match LAUS, BEA and OEWS for each region's start date within rounding.

## Out of scope

The national step (M1-macro), jobs and hiring (M1-04), and other places' governments and people (M1-13).

## Hand-off

The finisher draws two states, at least one with two metros, runs a year, and checks starting figures against sources, divergence inside the real spread, and that a town's new-hire pay and rent level follow its region.

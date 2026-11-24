# M1-history: the world before your start

**Contract:** M1-14 in `docs/roadmap/features.json`, as the owner set it (Oct 10): M1 builds the framework and the history of M1's own engines; elections and lawmaking add theirs when M2 and M3 land. **M1 test:** a new game in a random place opens on its start date; people have recent life events dated in the years before it; the economy's recent path matches real figures; laws in force show their dated changes before the start; governments show prior years' budgets; the load is measured. **Added with M2 and M3:** officials' records of how they were elected, and recent laws passed with their effects.

**Builder:** a new Codex session, CODEX-HISTORY, at **high**: it changes how the world opens, which every module depends on.
**Finisher:** a new Claude session, **Sonnet at high** (owner, Oct 10).
**Branch:** `pool/M1-history`, stacked on the latest M1 integration of the modules it calls. **Starts:** Part 1 as soon as this work order is approved; Part 2 as each M1 module lands.
**Owns:** `src/core2/history-*.ts`, `src/core2/data/history/`, and their tests. Changes to the opening (`src/core2/opening-*.ts`, `deep-past.ts`) are shared core changes for SOL-1258's review. Read `M1-common.md` first.

## What it is (owner, Oct 10)

Pre-start history is context for the world you start in, not a daily replay. Older history is generated. The years just before the start run at a coarse level, so elections were held, laws passed, the economy moved and people's lives happened before day one.

## What exists

- **New core:** the opening is dated January 2021 (stopgap `SG-P8-opening-vintage`), while starting law is 2026's (owner, Sept 28: games start with real current law). `src/core2/deep-past.ts` adds a supplied life's past (birth, schools, job tenure) with three public eras through 2021. OPUS-PEOPLE adds real schools, coworkers, falling-outs, dated moves and favors. The story director turns past facts into moments.
- **Old core:** the one-day pre-start run (`src/presentation/production-world.ts`, `new-game.ts`), which the owner replaced, and pre-start adult and child histories in `src/simulation/character-history.ts`.
- **Data:** CPI 2020 to 2026 and state minimum wages 2020 to 2024 (`data/research/money/historical-world-inputs.json`), 2020 to 2024 election returns, BEA regional income 1969 to 2024, LAUS, FEMA disasters, storm events 2000 to 2024.

## Build

### Part 1: open on the start date, with a coarse run before it

1. **Start date.** The world opens on its start date in 2026, matching starting law. The years from the latest full-data year (2021 today) to the start date are the coarse run; everything earlier is generated, as deep past does now.
2. **A pre-start step for every module.** Add one contract: a module may register a pre-start pass that steps its own records from the coarse run's first year to the start date at a coarse tier (monthly or quarterly aggregates, never daily people), writing dated records as if they had happened. Passes run in a stated order (economy, then people, then governments) and see each other's results.
3. **People's recent lives** come through OPUS-PEOPLE's builders as dated events in the coarse years (jobs taken and lost, moves, partnerships, births, deaths), consistent with the economy the coarse run produced.
4. **Speed and memory:** the coarse run must fit a short loading screen. Measure the opening's time and size with it, on the same machine as the base, and report both; the target is set in the M7 speed work.

### Part 2: M1 engines add their history

As each M1 module lands, add its pre-start pass:

- **M1-macro and M1-regional:** the real national and regional series for the coarse years, so conditions at the start match reality.
- **M1-laws:** each law's dated phases from the coarse years (minimum wage changes, tax schedules), so "in force since" dates are real.
- **M1-budgets-taxes:** prior fiscal years' adopted budgets from Census finance data.
- **M1-renewal and M1-jobs:** births, moves and job changes in the coarse years at real rates.
- **M1-officials:** placeholder accounts of how each holder reached the seat, registered until M2's elections write real ones.

## Out of scope

Elections' history (added with M2-07 and M2-10), lawmaking's history (added with M3-04 and M3-10), the story director's use of the past, and anything replayed daily.

## Hand-off

The finisher starts three new games in random places: each opens on its start date; named people have dated recent events consistent with the place's economy; the economy's coarse-year path matches the real series; laws show real "in force since" dates; prior budgets exist; and the load time and size are reported.

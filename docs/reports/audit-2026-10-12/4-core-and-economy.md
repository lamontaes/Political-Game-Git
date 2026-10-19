# Audit 4: core and world economy, as code (Oct 12, 9:15 a.m.; read-only helper; opus-core 88e8e8f5, opus-world 75c5a9c4, opus-play 79b669f9)

**Headline:** `src/core2` isn't on main, and every M0-08, M0-09, M1-02..08, M6-04, M7-01 and M7-02 spec still has `command: null` and `passes: false`. Nothing in this scope is checked automatically.

## Speed

- **174 s and 13.2 s a year were measured with no engine modules loaded.** The script (`scripts/core2-year/year.mjs`) loads no WORLD, PEOPLE or GOV modules and writes no receipt; the numbers live only in core.md and commit messages. The opening (~10–12 s) isn't counted.
- **The speed guard (M0-11) times the wrong thing:** a full 10,000-person month with no economy, never the two-level year.
- **On the bench** (29 modules):
  - opening a town takes 60 s;
  - a week takes 1.3 s;
  - 3 months took 20 s (about 80 s a year if it scales).
- **Nobody has measured a whole year on the bench.** The opening still builds all 10,000 people in full, and the bench keeps 264–398 full people through `familyClosure`.

## Two-level population

- **`fillInPerson` works** (`state.ts:1625`) and moves the household's money, schedules, contracts and voter-group share.
- **In play:** coworkers fill in at a shift, and doors fill in households (a stand-in).
- **Clicking a counted person throws "Resident does not exist"** (`server.ts:189–193, 204–208, 526–529`).
- **Fill-in replays records stored at the opening;** it doesn't regenerate from the seed.
- **"No past until filled in" and forgetting aren't met.**

## Money

- **"Every dollar balances" means conservation only:** outside payers pay in full, with no limit.
- **The closures fix may be a top-up.** Each firm's outside sales share is `max(industry floor, 1 − local sales / projected demand)`, so outsiders pay whatever local customers don't cover (`opening-outside-market.ts:144–152`, 429a33be). The work order says never top businesses up.
  - 0–4% closing is below real exit rates (about 9–10% a year).
  - The results exist only in a commit message, and `closures.mjs` fails on nothing.
- **WORLD found a cash explosion:** Absecon NJ went from $59.8M to $202.8M in a year. One wholesaler took $105.9M of sales against $40.5M of demand and paid $0 of operating costs. No answer in core.md.
- **The bench doesn't use the closures fix:** it skips `buildOpeningEconomy` and `addOutsideMarket`.
- **Saves (M7-02) are tests only:**
  - a recipe plus a command replay;
  - `coreApiVersion` is never checked, and there's no upgrade path;
  - loading replays from day one;
  - the bench never uses it.
- **Custom world (M6-04) is tooling only.** Politics settings are stored but nothing reads them, demographics and ideology don't exist, and the bench has no settings path.

## Economy (WORLD)

- **M1-02's check runs the national model with zero town feedback,** plus 19 town days on a stand-in credit line rather than the town bank.
- **Regional:** fixtures only.
- **Jobs, hiring 0.13% vs 3.6%:** counted workers (about 97%) can only retire (`jobs.ts:608, 938–966`); they never quit or look. That's the main cause. Missing: fit-based hiring, the OEWS staffing matrix, and named layoffs.
- **Credit:** loans for full households only; the bank holds no deposits.
- **Housing:**
  - In place: rent, arrears, eviction steps.
  - Missing: dwellings, prices, buying, mortgages, property tax.
  - One ownerless landlord.
  - Eviction sources conflict: 26 vs 51 of 56 places read from statute.
  - Landrum's rent check is circular (scaled from the same ACS median it's compared with).
- **Counted twice:**
  - Renters pay WORLD's landlord **and** the core stand-in's outside Fair Market Rent.
  - Owners are paid by both the core stand-in and WORLD's owner draws.
  - Nobody switches the core stand-ins off when WORLD runs.
- **Businesses:**
  - Founders come from full people only (70–400 of 10,000).
  - No closing by choice.
  - Entry and exit about 7% and 6% a year, against 10% and 9.7% real.

## Questions

1. A whole year on /play with all 29 modules: how long, and where's it recorded?
2. How is the outside-buyer residual different from topping up every firm?
3. Does /play still close about a third of businesses, since it skips the fix?
4. Who owns the $59.8M → $202.8M cash growth?
5. Why can't counted workers quit or look for work?
6. Who switches off the core stand-ins when the WORLD engines run?

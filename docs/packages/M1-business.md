# M1-business: businesses start, grow, add locations and close

**Contract:** M1-08 in `docs/roadmap/features.json`. A year's business openings and closings stay within real rates (Census Business Dynamics Statistics); owners' income comes from profit; across multi-year runs, some businesses add locations without being scripted to. This work order also emits the closure events M1-11 turns into drives.

**Builder:** a new Codex session, CODEX-BUSINESS, at **medium**: it builds on the business books, credit and jobs modules, with the design set here.
**Finisher:** a new Claude session, **Sonnet at high**.
**Branch:** `pool/M1-business`, stacked on `pool/M1-jobs`, with `pool/M1-credit` merged in locally. **Starts:** when M1-jobs and M1-credit are on their branches.
**Owns:** `src/core2/modules/business.ts`, `src/core2/business-growth-*.ts`, `src/core2/data/business/`, `data/research/business/`, and their tests. Changes to `src/core2/business-books.ts` and `finance-state.ts` are shared core changes for SOL-1258's review. Read `M1-common.md` first.

## What exists

- **Old core:** `src/simulation/living-world/town-businesses.ts` opens businesses where a town has fewer per resident than its peers (scanning all people and organizations), picks the owner by sorting, and closes on the books; clubs and congregations open and close by a seeded draw against a yearly chance (lines 761 and 808), which doesn't come across. There's no idea of a chain or a second location: outlets per kind are fixed in `town-employment.ts`.
- **Lifted rules:** `business-hiring.ts`, `business-layoffs.ts`, `business-book-math.ts`, `operating-income.ts`, `bank-credit.ts` in `src/rules/economy`. 29 of 40 are listed as not liftable; port the math.
- **New core:** business books, a monthly business review, closure (`closeEmployer`), finite credit, sales receipts, `addOrganization` and `addBusinessBooks`. Missing: founding by choice, an owner's draw, a second location, and closing one location.
- **Data:** CBP 2023 establishment counts by size (50 states and D.C.), Economic Census 2022, IRS SOI 2022 margins, the JPMorgan Chase Institute cash buffers (2016), FDIC.

## Research first

1. **Business births and deaths** by age, size, industry and state, and how often a business adds or drops a location: Census Business Dynamics Statistics and the BLS Business Employment Dynamics. Puerto Rico and the territories from their own statistics or labeled estimates.
2. **How owners start:** savings, family, loans (Census Annual Business Survey; the Federal Reserve's Small Business Credit Survey; check its terms).
3. **What owners take out:** owner pay and draws by business size (IRS SOI).
4. **Chains:** the share of establishments that belong to multi-unit firms, by industry (CBP and BDS).

## Build

1. **Starting a business is a choice.** People with the skills, savings or borrowing room, and the drive (an ambition, a calling, a lost job) get an offer to start one, scored from traits, money, drives and the town's unmet demand (from sales data and regional conditions, read from indexes). Funding comes from their savings and a loan through M1-credit; the founding posts through `postJournal`.
2. **Owners take profit.** On the owner's own schedule, the owner draws from the business's profit (never from its starting capital) through `postJournal`. The owner's household income comes from that draw.
3. **Growing and shrinking.** A business with strong books and unmet demand elsewhere gets an offer to open a new location (a new organization linked to its parent), scored from the owner's traits and the books; a weak location gets an offer to close. Chains and local tycoons emerge from repeated growth. No scripted chains.
4. **Closure** comes from the books. Closing a location ends its jobs through M1-jobs with the reason, and emits `organization.closed` naming the owner (and the person who decided) as responsible, so M1-11 can form drives.
5. **Clubs and congregations** open and close from members' choices and money, not a draw.
6. **Bench:** each business's owner, founding, locations and books; the town's openings and closings against BDS rates.

## The test, made exact

Over a year in a random place, establishment births and deaths fall inside the BDS range for comparable places by industry and size, and under 10% of establishments close (the M0-08 bar). Across three seeded three-year runs (run in the cloud; never on the owner's Mac), at least one business opens a second location without any code naming it.

## Out of scope

Mergers and buyouts (after early access, owner Oct 10), hiring itself (M1-jobs), loans (M1-credit), and taxes (M1-budgets-taxes).

## Hand-off

The finisher runs a year in a random place and a multi-year run: openings and closings within BDS ranges; one named founder with savings and a loan on record; one owner's income traced to profit; one business that added a location on its own, with the reasons recorded.

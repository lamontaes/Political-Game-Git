# OPUS-WORLD: The world's economy

Only OPUS-WORLD writes this file. See "The team" in `AGENTS.md` and `docs/coordination/BOARD.md`.

- **Owns:** The economy engines (national economy and central bank, state and metro, jobs, housing, credit, businesses growing).
- **Branch:** opus-world (from pool/M1-macro).
- **Model:** Opus, medium: engines with clear designs in the M1 work orders.
- **Starts from:** The national economy branch (#3959, research done) and the economy data tables already on main (#3973).

## What the owner can play now

Nothing on a screen yet. In code, one line adds the whole economy: `withWorldEconomy(input)` with `worldCoreData()` and `WORLD_MODULES` (`src/core2/modules/world.ts`). Such a world has state and metro economies, jobs that open and close for reasons, a town bank lending to businesses, and renters who can be evicted only through their state's steps; and a national economy that starts on the real figures of the month before its start date, a central bank board of 19 fictional members who vote eight times a year, monthly price, pay and demand conditions reaching every business, and prime-linked credit lines that reprice on a decision's effective date.

## Checklist

An order of work, not a ceiling: when it's done, keep going into this area's next roadmap items.

- [ ] **National economy and central bank.** *(Built on #3996; generated-world proof and bench panel in progress.)* Monthly growth, jobs, prices and rates; board members are fictional people deciding from their views.
  - Verified by: M1-02: a year inside real historical bands; one rate decision changes what loans cost in the town; every vote has its reasons.
  - Needs: CORE (calendar)
- [ ] **State and metro economies.** *(Built on #3996: 132 regions; tests pass; awaiting a generated-world year.)* Each state plus its one or two largest metros, moving with the nation by its own industries; towns follow their region.
  - Verified by: M1-03: two random states diverge plausibly; a town's prices and pay follow its region.
- [ ] **Jobs.** *(First cut on #3996 on a stand-in for the two-level population; fixture tests pass; generated-world year blocked on the speed of the opening with business books.)* Openings from need, hiring on fit, quits and layoffs for reasons, on the two-level population.
  - Verified by: M1-04: a year inside job-turnover ranges; every job change has a reason.
  - Needs: CORE (population, money fix)
- [ ] **Credit and housing.** *(First cuts on #3996: the town bank lends prime-linked business lines; owners and renters in the town's real share, rent with arrears, eviction through each place's steps. Household loans and mortgages wait for the core's accounts.)* Banks and loans that balance; rent, buying and evictions through each place's legal steps.
  - Verified by: M1-06 and M1-05.
  - Needs: GOV (laws), CORE (accounts)
- [ ] **Businesses growing.** Founding by choice, owners taking profit, new locations, chains emerging.
  - Verified by: M1-08.
  - Needs: Jobs, credit

## Needs from other sessions

- **OPUS-CORE: review `core2-api-v11`** (commit 7f810900 on `opus-world`): `repriceCreditFacility(id, rate, source)` accrues a credit line's interest to today at its old rate, then applies the new rate. Four small edits in `finance-types.ts`, `finance-plan.ts` (the interest planner reads the dated rate first), `finance-state.ts`, `state.ts`/`types.ts`, plus `finance-reprice.test.ts`. Please carry it on `opus-core` or tell me what to change.
- **OPUS-CORE, for later:** a year in a drawn town takes about 19 minutes (95 s per 31 days, Landrum, South Carolina), so the macro year proof runs the national model on its own plus a town month. My module adds no per-day scans.
- **OPUS-GOV, for later:** appointments to the central bank board (president nominates, Senate confirms) when offices land; until then stopgap `SG-WORLD-board-appointments`.
- **OPUS-PLAY:** a bench panel for the national series and each meeting's votes; I will add the data reader on my branch.

- **OPUS-CORE: review `core2-api-v12`** (commit on `opus-world`, `src/core2/job-lifecycle.ts`): `startJob(job, commitment, calendar)` admits one hire mid-run through the existing commitment and payroll-calendar writers; `endJob(jobId, sourceId)` ends one job from calendar work, before that day's shift, the same steps `closeEmployer` takes for each of its jobs. If you would rather `closeEmployer` call the same function, that's your call.
- **OPUS-CORE: the opening with business books is too slow to test on.** With `buildOpeningEconomy`, one 31-day month in Landrum, South Carolina did not finish in 30 minutes (5.9 GB). The plain opening runs 36 days in about 2 minutes but has no books, so no openings or layoffs. Jobs needs books in a world it can run.
- **OPUS-CORE: the two-level population.** The opening employs 2,167 of 6,264 working-age adults in Landrum; jobs treats only the neediest jobless adults as seekers (stopgap `SG-WORLD-jobs-opening-seekers`) until the wider population holds the rest as counts.

- **OPUS-CORE: review `core2-api-v13` and `-v14`** (`attachBusinessCredit`, `endStandingContract`, both small, in `finance-state.ts`).
- **OPUS-CORE: accounts.** Household loans, mortgages and bank deposits wait for named accounts; the bank lends only its equity until then (`SG-WORLD-credit-bank-equity-only`).
- **OPUS-GOV:** M1-laws' landlord-tenant reads will replace my eviction-steps table (`data/research/housing/eviction-steps-2026.json`), and state unemployment insurance will replace `SG-WORLD-jobs-benefits`.

## Questions for the owner

- **The first year's 12-month changes.** A world starting January 2021 compares its first months with real 2020, the pandemic year (unemployment +3.0 points, jobs −6.1% against the 1990–2026 bands). I judge the bands on months whose 12-month base is simulated and report the inherited months separately. If you want the first year judged too, the start date has to move or the first year has to start from a calmer base.

## Log

Newest first: one line per event (what changed, the measured result, what's next).

- 2026-10-12: housing first cut (M1-05). In Landrum, South Carolina, 78% of homes are owned (ACS: 986 of 1,267). Renters pay the county's median rent scaled by income; rent unpaid past the grace period starts a case that follows the place's notice, cure, hearing and stay, ending in removal and `housing.eviction`. A fixture on Texas's statute follows each step on the law's dates. Eviction steps for all 56 places are recorded, but only 6 have been read from statute text (Arizona, Delaware, Florida, South Carolina's notice, Texas, Northern Marianas). Helpers are now verifying the rest on official code sites.
- 2026-10-12: credit first cut (M1-06). The town bank holds the town's share of its county's FDIC deposits times the median small bank's equity share. It lends prime-linked lines to businesses short of cash, sized from its capital and their sales against wages. Each rate decision reprices those lines.
- 2026-10-12: **M1-02 proof.** In Landrum, South Carolina (seed 178c3c0c…, head 4028273b), the world opened June 1, 2022. The June 15 meeting raised the rate 0.875% → 1.625% unanimously. On June 16, The Cannon House's prime-linked line repriced from 5.455% to 6.205%.

- 2026-10-12: jobs first cut (M1-04). Businesses open positions when demand outgrows their staff and lay off when it falls short, keeping the most tenured and reliable; workers choose to stay, look or leave; jobless adults choose whether to look; seekers apply and employers offer the best-placed applicant. Fixture: a business with twice the demand hires a seeker; one at a quarter lays off its least reliable worker, names itself as the decider and emits `work.job-lost`; money balances. JOLTS 2001–2019 (hires 3.6%, quits 1.9%, layoffs 1.4% a month) and CPS duration (median 10.4 weeks) researched. Next: a generated-world year against JOLTS once the opening with books runs.
- 2026-10-12: generated-world proof for M1-02 in Landrum, South Carolina (seed 178c3c0c…, opened Oct 1, 2026): national conditions reached the town's 41 employers each month, every simulated band row inside, the Nov 4 meeting held at 3.875% with 2 dissents and every vote's pulls recorded. Speed: 36 days took 113.7 s with macro and regional against 127.7 s without (no measurable cost). A longer run for a rate change is going.
- 2026-10-12: state and metro economies (M1-03) on #3996. 132 regions from data (78 metros). Each starts on LAUS, CES, BEA price parities and income, and moves with the nation by its industry mix through measured sector betas (construction 3.1×, education and health 0.08×), with a state unemployment gap that fades at 0.994 a month. Two drawn states diverge inside the real 2000–2025 spread; the most cyclically exposed state falls furthest in a downturn. The town's pay and demand conditions now combine nation and region.

- 2026-10-12: macro module and board on #3996. From 2021, 2026 and 2008 openings, every simulated 12-month change stays inside the 1990–2026 bands over two years. From January 2021 the board holds at the floor until September, then lifts; from October 2026 it holds near 4.1% and cuts in November 2027 as unemployment rises toward 5%. Members lean hawk or dove by the inflation they lived through (−0.97 to +0.91). Next: generated-world proof in a drawn town, then the bench panel, then M1-03.
- 2026-10-12: research done. BLS, Fed H.15, BEA and FHFA series 1990–2026 acquired (the agency hosts now answer). Bands: unemployment −1.3 to +2.6 points, prices +0.31% to +5.65%, jobs −3.62% to +3.43% (12-month), output −1.67% to +6.69% (annualized quarterly). Mortgage pass-through 1.00 points per policy point within 12 months (HAC SE 0.39).
- 2026-10-12: branch `opus-world` from `pool/M1-macro` with main merged; draft #3996 opened; took over #3959. Golden path green.

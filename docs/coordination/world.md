# OPUS-WORLD: The world's economy

Only OPUS-WORLD writes this file. See "The team" in `AGENTS.md` and `docs/coordination/BOARD.md`.

- **Owns:** The economy engines (national economy and central bank, state and metro, jobs, housing, credit, businesses growing).
- **Branch:** opus-world (from pool/M1-macro).
- **Model:** Opus, medium: engines with clear designs in the M1 work orders.
- **Starts from:** The national economy branch (#3959, research done) and the economy data tables already on main (#3973).

## What the owner can play now

Nothing on a screen yet (the bench panel is next). In code, a world built with `withCentralBank(input)` and `MACRO_MODULE` has a national economy that starts on the real figures of the month before its start date, a central bank board of 19 fictional members who vote eight times a year, monthly price, pay and demand conditions reaching every business, and prime-linked credit lines that reprice on a decision's effective date.

## Checklist

An order of work, not a ceiling: when it's done, keep going into this area's next roadmap items.

- [ ] **National economy and central bank.** *(Built on #3996; generated-world proof and bench panel in progress.)* Monthly growth, jobs, prices and rates; board members are fictional people deciding from their views.
  - Verified by: M1-02: a year inside real historical bands; one rate decision changes what loans cost in the town; every vote has its reasons.
  - Needs: CORE (calendar)
- [ ] **State and metro economies.** Each state plus its one or two largest metros, moving with the nation by its own industries; towns follow their region.
  - Verified by: M1-03: two random states diverge plausibly; a town's prices and pay follow its region.
- [ ] **Jobs.** Openings from need, hiring on fit, quits and layoffs for reasons, on the two-level population.
  - Verified by: M1-04: a year inside job-turnover ranges; every job change has a reason.
  - Needs: CORE (population, money fix)
- [ ] **Credit and housing.** Banks and loans that balance; rent, buying and evictions through each place's legal steps.
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

## Questions for the owner

- **The first year's 12-month changes.** A world starting January 2021 compares its first months with real 2020, the pandemic year (unemployment +3.0 points, jobs −6.1% against the 1990–2026 bands). I judge the bands on months whose 12-month base is simulated and report the inherited months separately. If you want the first year judged too, the start date has to move or the first year has to start from a calmer base.

## Log

Newest first: one line per event (what changed, the measured result, what's next).

- 2026-10-12: macro module and board on #3996. From 2021, 2026 and 2008 openings, every simulated 12-month change stays inside the 1990–2026 bands over two years. From January 2021 the board holds at the floor until September, then lifts; from October 2026 it holds near 4.1% and cuts in November 2027 as unemployment rises toward 5%. Members lean hawk or dove by the inflation they lived through (−0.97 to +0.91). Next: generated-world proof in a drawn town, then the bench panel, then M1-03.
- 2026-10-12: research done. BLS, Fed H.15, BEA and FHFA series 1990–2026 acquired (the agency hosts now answer). Bands: unemployment −1.3 to +2.6 points, prices +0.31% to +5.65%, jobs −3.62% to +3.43% (12-month), output −1.67% to +6.69% (annualized quarterly). Mortgage pass-through 1.00 points per policy point within 12 months (HAC SE 0.39).
- 2026-10-12: branch `opus-world` from `pool/M1-macro` with main merged; draft #3996 opened; took over #3959. Golden path green.

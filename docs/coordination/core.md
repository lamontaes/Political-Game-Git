# OPUS-CORE: The core

Only OPUS-CORE writes this file. See "The team" in `AGENTS.md` and `docs/coordination/BOARD.md`.

- **Owns:** src/core2 (state, clock, choices, ledger, population, speed, money), except the engine modules other pillars own.
- **Branch:** opus-core (from pool/M0-core-pieces).
- **Model:** Opus, high: core design every other pillar builds on.
- **Starts from:** Sol's last push (pool/P8-part-1 at 1690a31e7, PR #3918) plus the checked core pieces (pool/M0-core-pieces, PR #3955). Takes over both. Sol's unpushed work (mainly accounts) is gone and gets rebuilt.

## What the owner can play now

Nothing on screen yet from the core alone. Underneath, **a town's year now runs in 13 seconds** instead of about 3.3 hours, so skipping ahead in the evening build stops being a wait once PLAY builds on `opus-core`. The town still takes about 25 seconds to open; that's next on my list after fill-in.

## Checklist

An order of work, not a ceiling: when it's done, keep going into this area's next roadmap items.

- [x] **Take over and publish.** Branch opus-core from pool/M0-core-pieces; confirm the core's tests pass; first push within the hour.
  - Done Oct 12: `opus-core` = pool/M0-core-pieces + pool/P8-part-1 (1690a31e7, which pool/M0-core-pieces did not actually contain) + main; draft PR #3999. Golden path green (M0-10, M0-11). The core's tests started with 63 failures inherited from Sol's head; all 1,557 pass since fbb549ee.
  - Verified by: Core tests and the golden-path suite (M0-10) green on its branch.
- [x] **Speed, first thing.** 1) Bookkeeping off in play: recording, checking, copying and freezing every read and write (about half of all time) becomes a switch that's on only in tests and the bench. 2) Stop copying each worker's whole memory every shift (why months get slower). 3) Save "why" reasons only for the player and the people they deal with.
  - Verified by: One measured year in a random place, reported as a number; the automatic speed guard stays green.
  - Done Oct 12: one year in Cheat Lake, West Virginia (random draw) took **13.2 s**, with bookkeeping off, the two-level population, and 76 full people out of 10,000. Every dollar balances. The speed guard (M0-11) is green. Bookkeeping on and off give identical cash and closures (checked in Higden, Arkansas).
- [x] **Two-level population.** Full people only for the player, their household and circle, people met or clicked, officials and named people; everyone else is counts by place, age, job and household plus voter groups; filled in on click from the seed, matching the records; nobody gets a past or memory until filled in.
  - Verified by: Its own tests: filling someone in moves them from counts to people with every total unchanged; a clicked employee matches the business's books. Then a year measured once: the target is under two minutes. You click around in the evening build.
  - Needs: PEOPLE (how fill-in builds kin and a past; how people forget)
  - Done Oct 12 (ebaa5fd8, a9976886, f4be16bc, 66a02608): full people are the player, their household, family and the people they know, plus public workers (about 70 of 10,000). Everyone else is household records plus one residents account per place. `fillInPerson(core, id)` brings a whole household in: their recorded job, their share of the cash, scheduled shifts on the employer's pay cadence, and their own purchases, with every total unchanged (tested). Retirement income stays pooled (stopgap). A year runs in 13 s. Voter groups from the counts wait on views (PEOPLE/GOV). The owner's click-around happens in the evening build once PLAY uses `generatedOpening(place, { twoLevel: true })`.
- [x] **Why a third of businesses close.** Diagnose with numbers for closed and surviving businesses (industry, starting cash, sales against payroll, customers, when the shortfall hit); post on #3918; fix the cause; never top up or loosen the rule.
  - Verified by: M0-08's five checks in a newly drawn place: under 10% close, sales over half of wages, every dollar balances (automatic and blocking), outside money reported, national conditions labeled.
  - Needs: WORLD later replaces the flat national conditions
  - Done Oct 12 (f4be16bc): the cause is that 11 of 14 closing firms had no customer route at all; the numbers are on #3918. Fix: buyers from outside the town, each firm's sourced outside share of its own projected receipts. M0-08 in a new random place, Maricopa Colony, Arizona: **0 of 28 close**, sales are 6.4 times wages, every dollar balances, outside money is reported by source, and the national conditions are labeled. Still open: the private school has no tuition route (1 of 25 closed in Cheat Lake), and no resident money leaves the town yet, so town cash keeps growing.
- [x] **Accounts.** Rebuild the accounts piece: named accounts, obligations that come due, all through the one balanced ledger (postJournal).
  - Verified by: Contract tests; M0-09 passes when GOV's budgets and WORLD's first engine build on it without patching the core.
  - Needs: GOV, WORLD
  - Built Oct 12 (429a33be): `api.accounts()` (`src/core2/accounts.ts`) gives `open`, `main`, `balance`, `transfer` (one balanced journal entry; outside accounts are reported outside flows) and obligations with dates and arrears (`addObligation`, `obligation`, `endObligation`). Contract tests: `accounts.test.ts`. The residents engine posts through it, so there's one writer. Waiting on GOV's budgets and WORLD's first engine to build on it for M0-09.
- [ ] **Onto main.** Merge the core and the work stacked on it into main, in order, once the above pass.
  - Verified by: Owner approval (the core needs your review to merge); main's checks green afterward.
  - Needs: CTO, owner
- [ ] **Standing duty.** Review other pillars' core requests on its PR within the day.
  - Verified by: Requests answered in its status file.
  - Needs: All

## Requests to the core (answered here)

- **WORLD, `repriceCreditFacility` (core2-api-v11, 7f810900):** accepted and carried on `opus-core` as is. It accrues at the old rate to today, then switches, with the same accrual arithmetic as the interest planner.
- **GOV, re-rate a job's pay from a date:** **done** (core2-api-v12 on `opus-core`). `api.rerateJob(jobId, hourlyMinor, source)` changes pay from today. It works for full workers (their commitment's rate) and for counted workers (their exact share of the employer's wage flow), so a minimum wage reaches the whole town. Each change is recorded in `core.work.payChanges`. Call it on the law's effective date, for example from your calendar work, and you can retire `SG-GOV-wage-floor-rate-write`. To find counted jobs below a floor, use `residentsRuntime(core).jobs` (`src/core2/modules/residents.ts`).
- **GOV, opening pay reads the start date's law:** accepted. `population.ts` will floor opening pay from the law rows in force on the start date, once your `lawInForce` is on main or on `opus-gov`. Until then the old table stays.
- **GOV, fill-in for named officials:** yes. This is part of the two-level population: fill-in takes an identity (name, birth date, place, seat) and builds the full person from the world's seed.
- **PLAY, resume as the character's own choice:** **done**. `resumePlayerV1(core, { kind: "own-choice", pauseId })` saves the act as the character's own decision: no `controlledChoice`, and the character's own `reasonKey`.
- **PEOPLE, `peerCohortSize(circle, contextKey)`:** accepted. The count comes from the wider population's records; it's part of the two-level population.
- **Everyone, the two-level population (new, ebaa5fd8):** `CoreInput.residents` holds the wider population. `residentCounts(core)` in `src/core2/modules/residents.ts` gives counts by place, age band and employer. People outside the circle who are tied to someone in it are husks (`core.husks`), filled in when met.

## Needs from other sessions

- **OPUS-GOV and OPUS-WORLD: build budgets and engines on `api.accounts()`** (M0-09 passes when you do, without patching the core). Open named funds with `accounts.open`, move money with `accounts.transfer`, and schedule payments with `accounts.addObligation`. Tell me here what's missing.
- **OPUS-WORLD:** the town has no money leaving it. Residents never buy from outside, and nobody pays taxes or imports, while buyers from outside pay in (`src/core2/opening-outside-market.ts`, stopgap `SG-CORE-outside-market`). Your regional and national engines should own both directions: outside demand for the town's firms, and the share of residents' spending that leaves. I'll take your flows into the residents engine (`ResidentFlowInput`, kind `outside-sales`) or whatever shape you prefer.
- **OPUS-PLAY:** to use the fast world, open towns with `generatedOpening(place, { twoLevel: true })` (`src/core2/tooling/generated-world.ts`), and call `fillInPerson(core, personId)` when the player clicks or meets someone who isn't a full person yet.
- **OPUS-PEOPLE:** fill-in admits the household's generated records as they were built at the opening, past included. When your `buildOpeningKin` and `peerCohortSize` land, fill-in can switch to building on demand; the counts already give sizes by place and age band (`residentCounts`).

## Log

Newest first: one line per event (what changed, the measured result, what's next).

- Oct 12, 21:30 UTC: **core suite green: 1,557 of 1,557** (fbb549ee). A Sonnet helper updated the 63 stale fixtures to the payday model, and I reviewed them. The real bug it found was that household evidence didn't resolve employer payroll calendars; that's fixed. Next: a faster opening (M7-01, a count mode in the opening economy).
- Oct 12, 20:30 UTC: **fill-in v2** (66a02608). A person filled in from the counts now gets their own money and work: their cash share through the journal, shifts on the employer's pay cadence with pay, and their household's purchases. The merged flows shrink by the same amounts, and every dollar balances (tested in a random place). Next: test fixtures (a helper is fixing the 63 stale ones), then a faster opening (M7-01).
- Oct 12, 19:30 UTC: **accounts built** (429a33be). The closures fix now balances both ways: firms buy outside what they don't buy locally, on net-30 terms, so profits no longer pile up. M0-08 in two new random places: Ernstville, Maryland, 1 of 27 close (a firm that opened with about three days of cash); Christiansted, U.S. Virgin Islands, 0 of 28. Every dollar balances.
- Oct 12, 17:30 UTC: answered PLAY (the `own-choice` resume) and GOV (`rerateJob`, core2-api-v12). Both have tests; the golden path is green.
- Oct 12, 16:30 UTC: **closures fixed, fill-in in** (f4be16bc). Firms with no customers now sell to buyers outside the town, using researched shares from the 2017 Economic Census and USDA. M0-08 passes in Maricopa Colony, Arizona: 0 of 28 close. `fillInPerson(core, id)` brings a counted person's household in as full people with their counted job; their money stays pooled for now (stopgap). Next: fill-in moves their money and work too, then a faster opening (the town still takes about 25 s to open because everyone is generated in full first), then the requests from GOV, PLAY and PEOPLE.
- Oct 12, 14:00 UTC: **a year in 13.2 s** (a9976886), Cheat Lake, West Virginia (random draw, seed d2ef241b…, 10,000 people). Full people are now the player, their household, family and people they know, plus public workers: 76 here. Agreements can name counted workers, and play skips the remaining evidence copies. Closures: 14 of 25 businesses closed in that year, which is next after fill-in.
- Oct 12, 12:30 UTC: **two-level population, first cut** (ebaa5fd8). Only the player's circle and household, public workers, and workers that recorded agreements name stay full people. Everyone else is household records plus one residents account per place. Their pay, retirement income and purchases move as dated flows through the one journal, with every total unchanged. Measured once, Higden, Arkansas (10,000 people, 542 full): **one game year in 174 s**, against about 3.3 hours this morning. Every dollar balances, and a bookkeeping-on run gives identical cash and closures. The same year closes 14 of 27 businesses, which is the closures item. Next: let agreements cite counted workers (down to about 60 full people), fill-in on click, then closures. To use it: `collapseToTwoLevels(input)` (`src/core2/residents.ts`), or `generatedOpening(place, { twoLevel: true })` (`src/core2/tooling/generated-world.ts`).
- Oct 12, 10:00 UTC: **bookkeeping off in play** (d78e9588). The record checks, deep copies and the journal's double lookups now run only in tests (`CORE2_BOOKKEEPING=1` turns them on anywhere). Workers' memory is updated in place instead of copied every shift. One January in Higden, Arkansas (10,000 people, economy on) took 589 s before and 194 s after. That's about 40 minutes a year, still far from two; the rest is 68,000 household purchase contracts and 10,000 full people acting, which the two-level population removes. Next: the two-level population.
- Oct 12, 07:30 UTC: took over #3918 and #3955 on `opus-core` (#3999). The merge had left duplicate imports in `state.ts` that broke 58 test files; fixed. Starting point for speed: Sol's money year ran at 1.83 game days per minute (about 3.3 hours per year).

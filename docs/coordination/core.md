# OPUS-CORE: The core

Only OPUS-CORE writes this file. See "The team" in `AGENTS.md` and `docs/coordination/BOARD.md`.

- **Owns:** src/core2 (state, clock, choices, ledger, population, speed, money), except the engine modules other pillars own.
- **Branch:** opus-core (from pool/M0-core-pieces).
- **Model:** Opus, high: core design every other pillar builds on.
- **Starts from:** Sol's last push (pool/P8-part-1 at 1690a31e7, PR #3918) plus the checked core pieces (pool/M0-core-pieces, PR #3955). Takes over both. Sol's unpushed work (mainly accounts) is gone and gets rebuilt.

## What the owner can play now

Nothing on screen yet from the core alone. Underneath, a town's year now runs in about 3 minutes instead of about 3.3 hours, so "skip ahead" in the evening build stops being a wait once PLAY picks up `opus-core`.

## Checklist

An order of work, not a ceiling: when it's done, keep going into this area's next roadmap items.

- [x] **Take over and publish.** Branch opus-core from pool/M0-core-pieces; confirm the core's tests pass; first push within the hour.
  - Done Oct 12: `opus-core` = pool/M0-core-pieces + pool/P8-part-1 (1690a31e7, which pool/M0-core-pieces did not actually contain) + main; draft PR #3999. Golden path green (M0-10, M0-11). Core tests: 1,481 pass, 63 fail; all 63 also fail on Sol's own head (test fixtures that predate the payday-calendar requirement); fixing them is on my list.
  - Verified by: Core tests and the golden-path suite (M0-10) green on its branch.
- [ ] **Speed, first thing.** 1) Bookkeeping off in play: recording, checking, copying and freezing every read and write (about half of all time) becomes a switch that's on only in tests and the bench. 2) Stop copying each worker's whole memory every shift (why months get slower). 3) Save "why" reasons only for the player and the people they deal with.
  - Verified by: One measured year in a random place, reported as a number; the automatic speed guard stays green.
- [ ] **Two-level population.** Full people only for the player, their household and circle, people met or clicked, officials and named people; everyone else is counts by place, age, job and household plus voter groups; filled in on click from the seed, matching the records; nobody gets a past or memory until filled in.
  - Verified by: Its own tests: filling someone in moves them from counts to people with every total unchanged; a clicked employee matches the business's books. Then a year measured once: the target is under two minutes. You click around in the evening build.
  - Needs: PEOPLE (how fill-in builds kin and a past; how people forget)
- [ ] **Why a third of businesses close.** Diagnose with numbers for closed and surviving businesses (industry, starting cash, sales against payroll, customers, when the shortfall hit); post on #3918; fix the cause; never top up or loosen the rule.
  - Verified by: M0-08's five checks in a newly drawn place: under 10% close, sales over half of wages, every dollar balances (automatic and blocking), outside money reported, national conditions labeled.
  - Needs: WORLD later replaces the flat national conditions
- [ ] **Accounts.** Rebuild the accounts piece: named accounts, obligations that come due, all through the one balanced ledger (postJournal).
  - Verified by: Contract tests; M0-09 passes when GOV's budgets and WORLD's first engine build on it without patching the core.
  - Needs: GOV, WORLD
- [ ] **Onto main.** Merge the core and the work stacked on it into main, in order, once the above pass.
  - Verified by: Owner approval (the core needs your review to merge); main's checks green afterward.
  - Needs: CTO, owner
- [ ] **Standing duty.** Review other pillars' core requests on its PR within the day.
  - Verified by: Requests answered in its status file.
  - Needs: All

## Requests to the core (answered here)

- **WORLD, `repriceCreditFacility` (core2-api-v11, 7f810900):** accepted and carried on `opus-core` as is. It accrues at the old rate to today, then switches, with the same accrual arithmetic as the interest planner.
- **GOV, re-rate a job's pay from a date:** accepted. I'll add `api.rerateWorkCommitment(commitmentId, hourlyMinor, from, source)`, which closes the current pay terms at `from` and opens new ones. Keep your stopgap until it lands; I'll note it here when it does.
- **GOV, opening pay reads the start date's law:** accepted. `population.ts` will floor opening pay from the law rows in force on the start date, once your `lawInForce` is on main or on `opus-gov`. Until then the old table stays.
- **GOV, fill-in for named officials:** yes. This is part of the two-level population: fill-in takes an identity (name, birth date, place, seat) and builds the full person from the world's seed.
- **PLAY, resume as the character's own choice:** accepted. I'll add `{ kind: "own-choice", pauseId }` to `resumePlayerV1`, which saves the act as the character's decision.
- **PEOPLE, `peerCohortSize(circle, contextKey)`:** accepted. The count comes from the wider population's records; it's part of the two-level population.
- **Everyone, the two-level population (new, ebaa5fd8):** `CoreInput.residents` holds the wider population. `residentCounts(core)` in `src/core2/modules/residents.ts` gives counts by place, age band and employer. People outside the circle who are tied to someone in it are husks (`core.husks`), filled in when met.

## Needs from other sessions

None yet.

## Log

Newest first: one line per event (what changed, the measured result, what's next).

- Oct 12, 12:30 UTC: **two-level population, first cut** (ebaa5fd8). Only the player's circle and household, public workers, and workers that recorded agreements name stay full people. Everyone else is household records plus one residents account per place. Their pay, retirement income and purchases move as dated flows through the one journal, with every total unchanged. Measured once, Higden, Arkansas (10,000 people, 542 full): **one game year in 174 s**, against about 3.3 hours this morning. Every dollar balances, and a bookkeeping-on run gives identical cash and closures. The same year closes 14 of 27 businesses, which is the closures item. Next: let agreements cite counted workers (down to about 60 full people), fill-in on click, then closures. To use it: `collapseToTwoLevels(input)` (`src/core2/residents.ts`), or `generatedOpening(place, { twoLevel: true })` (`src/core2/tooling/generated-world.ts`).
- Oct 12, 10:00 UTC: **bookkeeping off in play** (d78e9588). The record checks, deep copies and the journal's double lookups now run only in tests (`CORE2_BOOKKEEPING=1` turns them on anywhere). Workers' memory is updated in place instead of copied every shift. One January in Higden, Arkansas (10,000 people, economy on) took 589 s before and 194 s after. That's about 40 minutes a year, still far from two; the rest is 68,000 household purchase contracts and 10,000 full people acting, which the two-level population removes. Next: the two-level population.
- Oct 12, 07:30 UTC: took over #3918 and #3955 on `opus-core` (#3999). The merge had left duplicate imports in `state.ts` that broke 58 test files; fixed. Starting point for speed: Sol's money year ran at 1.83 game days per minute (about 3.3 hours per year).

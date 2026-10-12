# OPUS-CORE: The core

Only OPUS-CORE writes this file. See "The team" in `AGENTS.md` and `docs/coordination/BOARD.md`.

- **Owns:** src/core2 (state, clock, choices, ledger, population, speed, money), except the engine modules other pillars own.
- **Branch:** opus-core (from pool/M0-core-pieces).
- **Model:** Opus, high: core design every other pillar builds on.
- **Starts from:** Sol's last push (pool/P8-part-1 at 1690a31e7, PR #3918) plus the checked core pieces (pool/M0-core-pieces, PR #3955). Takes over both. Sol's unpushed work (mainly accounts) is gone and gets rebuilt.

## What the owner can play now

Nothing yet.

## Checklist

An order of work, not a ceiling: when it's done, keep going into this area's next roadmap items.

- [ ] **Take over and publish.** Branch opus-core from pool/M0-core-pieces; confirm the core's tests pass; first push within the hour.
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

## Needs from other sessions

None yet.

## Log

Newest first: one line per event (what changed, the measured result, what's next).

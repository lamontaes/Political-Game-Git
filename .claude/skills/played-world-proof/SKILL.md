---
name: played-world-proof
description: >
  Proves an Our Civic Duty feature in a one-year run of the played world, with
  another engine reading what it wrote, named by record id. Use before calling
  any feature, law or module finished.
---

# Played-world proof

**Look first (`look-first`, owner Oct 27):** before building, fixing, filing or asking anything, run the look-first search (OWNER-DECISIONS, DECISION-REGISTER, prior-rulings, LAW, the sitting blocks, docs, the pool, Drive); a found ruling is built and cited, never asked again; a question without the reading line is sent back.

**SMART (owner, Oct 26; `.agents/rules/smart-and-look-first.md`).** A proof's done-when is the record id another engine read, in a drawn place, inside the time box the item set.

Current as of 2026-10-24, 21:30 UTC (unchanged by the Oct 24 rulings; a play-first lane item's acceptance is a screenshot, `play-first`, and this proof backs the engine side)

A feature counts as finished only when the running game shows another part of the game using what it made. A small test world does not show that.

## The run

1. Pick a seed you did not choose: `SEED=$(node -e "console.log(require('crypto').randomBytes(6).toString('hex'))")`. Name the seed and place in the PR body.
2. Build the world: `buildBenchWorld(seed, gameStartDate(), { twoLevel: true })` from `src/bench/world`, with every module installed. Advance one year with `DevMode` (see `scripts/trace/viewer.ts` for the exact calls).
3. Run the golden-path proof:
   `PLAYED_WORLD_SEED=<seed> node --max-old-space-size=8192 --expose-gc --import tsx --test-reporter=spec tests/golden-path/played-world.node-test.ts`
   Module coverage lives in `tests/golden-path/played-world-modules.node-test.ts`.

## Find the record ids

- `core.durableLog` is a map of id to record. Filter by `kind`, as the viewer does.
- Module tables sit under `src/core2/modules/<name>.ts`; read the table the module owns.
- Name the writer's record id and the reader's record id (the payment, price, eligibility, decision reason or kept measure that read it).

## The chain

A bill, budget line or executive act is finished only when one dollar or one rule is followed to a named person and back out:

1. the record (bill, line or act);
2. the law in force changing;
3. the payment or price that changed;
4. the person it reached;
5. the choice or view that moved because of it;
6. the director's scene or journal line.

Name the few people it reached by record id. Most people are untouched; say so.

## Rules

- An effect is a read: a record nobody else reads is a placeholder. Register it as a stopgap.
- Hand-inserted fixtures prove edge cases only.
- Speed: measure a game year before and after with `npm run speed:year`, on the same base and machine, one process at a time. No change makes a year more than 20% slower. A year must run under two minutes.
- Every dollar balances; the golden-path suite must stay green.
- Answer why for every number you report (see `ask-why`).

## Native bench papers after a scripted route

Keep the route and bench server in the same ESM module context: a temporary `.ts` script outside this module-type repository can load a second CommonJS handler, leaving the browser with an empty world even though the script has a life. Use an in-repository script or an external `.mts` script, and verify `/api/title` before clicking Continue. To read a sponsored bill through Your office, select its sponsor from the played town's actual seats; the page lists that member's own bills. A single office page may already be open with its tab hidden. Record when historical papers are reopened: their estimate can read today's law while the roll call and decision remain historical.

The pool CLI temporarily checks out `origin/main` in its working directory to publish a claim or status. Finish that command before running a test, browser proof or benchmark in the same worktree; a concurrent runner can otherwise see main's files instead of the candidate.

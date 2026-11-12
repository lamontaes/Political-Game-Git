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

A play-first lane item's acceptance is a screenshot (`play-first`); this proof backs the engine side. A pool item at the standard (`.agents/rules/pool-item-standard.md`, owner Nov 10) asks for the proof in **two drawn places**, each named with its seed (`drawPlace` in `tests/golden-path/place.ts`, which a test calls and names in every failure).

A feature counts as built only when the running game shows another part of the game using what it made. A small test world does not show that. This is the builder's proof. It makes the work ready to merge, not done: a second session's check in the running game does that (`seen-in-game`; `npm run pool -- seen`). Put the proof line on the item's pull request, where the next agent finds it.

## The run

1. Pick a seed you did not choose: `SEED=$(node -e "console.log(require('crypto').randomBytes(6).toString('hex'))")`. Name the seed and place in the PR body.
2. Build the world: `buildBenchWorld(seed, gameStartDate(), { twoLevel: true })` from `src/bench/world`, with every module installed. Advance one year with `DevMode` (see `scripts/trace/viewer.ts` for the exact calls). The world outside the town is the country tier: states kept as counts with a treasury and stepped monthly (`docs/design/country-tier.md`). A feature that reaches other states shows its record in that tier, not in a separate national table; time can also skip with results first, so prove a skipped stretch and a played day when the feature spans both.
3. Run the golden-path proof:
   `PLAYED_WORLD_SEED=<seed> node --max-old-space-size=8192 --expose-gc --import tsx --test-reporter=spec tests/golden-path/played-world.node-test.ts`
   Module coverage lives in `tests/golden-path/played-world-modules.node-test.ts`.

## Find the record ids

- `core.durableLog` is a map of id to record. Filter by `kind`, as the viewer does.
- Module tables sit under `src/core2/modules/<name>.ts`; read the table the module owns.
- Name the writer's record id and the reader's record id (the payment, price, eligibility, decision reason or kept measure that read it).
- A person's history is read from their one life record (`docs/design/life-record.md`; `src/core2/person-life.ts` once it has merged), not rebuilt by the screen or scene you are proving.

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
- **Run on the latest main (owner, Nov 8, 11:05):** "anything that requires them to run a world should update with like the speed update, so that way there isn't a speed update that's sitting there all merged, but it's running it on an old one." Before any run that plays a world (a proof, test, drift or twin run, golden-path replay or timing), merge the latest main into the branch. A run on a branch more than a few hours behind main is not proof. Name the main commit in the proof line ("on main abc1234 + this branch").
- When a controlled budget amendment needs a positive benefit program, read the current and adopted line through the budget engine before choosing its amount. Opening fiscal rules may already have cut the line below its base, so a fixed increase can still create no benefit. Keep the assertion that actual payment obligations exist; correct the fixture instead of skipping the drawn place or weakening that assertion. For an explicit new recipient fixture, use `api.addPersonV1` to admit the person and their cash account; `initialPersonState` only constructs the person object and does not register cash ownership or indexes.
- Speed: measure a game year before and after with `npm run speed:year`, on the same base and machine, one process at a time. No change makes a year more than 20% slower. A year must run under two minutes.
- Every dollar balances; the golden-path suite must stay green.
- Answer why for every number you report (see `ask-why`).

## Native bench papers after a scripted route

Keep the route and bench server in the same ESM module context: a temporary `.ts` script outside this module-type repository can load a second CommonJS handler, leaving the browser with an empty world even though the script has a life. Use an in-repository script or an external `.mts` script, and verify `/api/title` before clicking Continue. To read a sponsored bill through Your office, select its sponsor from the played town's actual seats; the page lists that member's own bills. A single office page may already be open with its tab hidden. Record when historical papers are reopened: their estimate can read today's law while the roll call and decision remain historical.

`npm run pool` commands that publish a claim or status temporarily check out `origin/main` in the working directory (they may do so differently since the Nov 10 `next` command; if unsure, treat it as true). Finish that command before running a test, browser proof or benchmark in the same worktree; a concurrent runner can otherwise see main's files instead of the candidate.

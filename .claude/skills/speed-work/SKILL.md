---
name: speed-work
description: >
  How Our Civic Duty's speed work is done: timing a country's year with npm run
  speed:year, proving a faster path changes nothing with dev mode's records
  proof, finding exact cuts in a CPU profile of an election year, folding
  tables that grow with history once their readers' windows are agreed, and
  running long saves. Use for any core-speed-* or core-long-run-* item, any PR
  that says a year runs faster, and any change that drops or summarizes old
  records. Not for screen or browser speed, and not for the release
  machinery's timings.
---

# Speed work

**The bar** (`OWNER-DECISIONS.md`, Oct 30 01:55 and 03:20; `AGENTS.md`, "Speed"): on `npm run speed:year` in a place drawn from all 56, one process at a time, each year of a country's year runs under 120 seconds, and no change makes a year more than 20% slower than its base. Over one save, years 97 to 100 average at most 1.2 times years 1 to 4, for time, heap after a collection and records kept. A speed change never changes what the simulation decides.

## Time it

- Every run: `OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" NODE_OPTIONS=--max-old-space-size=8192 npm run speed:year -- --seed <seed> --proof-out <file>`. It runs four years by default, so every check includes an election year. A one-year check measured only 2025, an off year: in a Ringgold, Louisiana save 2025 took 52 s and 2028 took 155 s.
- Profile an election year (year 4, 2028), not year 1. `--cpu-prof` makes a year about 1.35 times slower; convert profile seconds before you quote them.
- A cloud container has 4 cores and about 15 GB. Two heavy runs at once is the limit; a third, or a long save beside them, gets killed for memory near 4 GB each (Oct 30).
- Compare times only alternating base and head with nothing else running, twice (base, head, base, head). A cut worth a few percent is inside one run's noise: build such cuts separately, then time them merged together and quote that.

## Prove it changes nothing

- `--proof-out` writes dev mode's records proof (`src/bench/dev-proof.ts`): a digest per table over everything a world keeps, every core table, engine table and engine runtime part, the counted population included. The receipt's fingerprint is that digest.
- Take both proofs on the same main: merge one pinned main commit into the branch, run that main and the branch one after the other, same seed and years. `compareProofs` names each differing table, its row counts and the first differing id.
- A pure speed cut shows 0 differing tables. A fold shows only its own tables.
- A unit test with its own small world proves an edge, never sameness in play.

## Find exact cuts

- Read a profile by inclusive time under one engine's entry, then ask what is computed again with the same inputs. Patterns that paid on Oct 29 and 30: a value recomputed inside a sort comparator (town halls, about 4%); an id search that tries every id taken that day (`keepWeighing`, 12% of a presidential year); a person built twice to read an id; a list sorted again though it only grows at its end; a per-call closure, which tsx names at run time (`keepNames`); a check that only tests need, run in play.
- What keeps a cut exact: the same reads in the same order (a first read can write, as an opening stance does), the same draws, the same float operations in the same order. A cache is keyed on everything it reads, lives beside the state (a `WeakMap` keyed by the world or store), never in a saved field, and resets when what it reads changes (the date, a table's write count). A check that only guards may skip in play under `bookkeeping()`; under bookkeeping, which tests run, it runs as before, or the old path runs beside the new one and must agree.
- Have a second agent review each cut for exactness from the diff and the code before the PR, then prove it with the records proof.

## Fold what grows

- Under the Oct 30 01:55 ruling (keep what play reads, summarize the rest once it closes) the CTO ruled at 04:14 that folds are built, not asked: agree each reader's window with its owner (`docs/coordination/CREW.md`), and go ahead on a yes or after an hour with no answer. Name the readers and windows in the PR body. One fold per PR.
- Sweep every reader of the table, its indexes and its query functions. The dev trace's `findRecord` reads any engine table by id, so a row moved to another table of the same engine is still found.
- The fold's test reads the same answers before and after (a standing, a scene's check), and folding twice changes nothing. Its records proof differs only in the folded tables.
- What grew in a Ringgold, Louisiana save by year 8 (before folds): campaign causes, then per-circle kept causes (circle members times candidates), the event log and speech retellings. The player's circle grows over time, so anything kept per circle member grows with it.
- Totals that only grow overflow: the money journal's lifetime totals passed 2^53 cents in year 7 and now go to `bigint` past the safe range.

## Long saves

- A 100-year save needs a machine of its own: the long-run runner session (`CREW.md`) runs it and sends year lines. `speed:year` writes its receipt as each year ends, with each year's heap, process memory and records kept, so a killed run keeps its marks.
- A measurement branch that merges unmerged fixes is merged by commit: take each head from `git ls-remote origin <branch>` and merge that SHA, since a helper copy's `origin/<branch>` can be stale.

## Stop condition

Done when every timed claim names the place, seed, years and machine, every speed PR carries an identical records proof (or a fold's named tables), and the item's done-when lines each have that evidence.

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
- The Every place nightly runs four places at once on a 4-core runner with a 4 GB heap each, so its seconds run high. Replay a slow place alone with the nightly's own world seed and locality through the dev clock, as `scripts/core2-year/all-places-worker.ts` does (`speed:year --seed` draws a different world seed), and profile it. On Nov 1, Storrs, Connecticut's 1,075 s year was housing filling in every evicted counted household: full people went from 1,747 to 5,804 in a year, and every engine that grows with full people slowed with them.
- A test run ended by `timeout` can leave its worker processes running; the next `speed:year` then reads one year high (Nov 1, #6932 year 3: 49.7 s against 30.9 s alone). Check `ps` for stray vitest workers before a timing, and rerun an odd year alone before calling it slow.
- Hold heavy runs to two at once with a lock, not a process check: a wait loop on `pgrep -f` matches its own Monitor's command line and waits forever (Oct 30). A two-slot `flock` gate that also waits for 5 GB free works, but it checks memory only at the start, so a run that grows past 4 GB can still be killed beside another (Nov 1, a two-year Ringwood, New Jersey run).
- A low-priority lane starves while workflows keep queueing proofs: on Nov 1 three investigation runs waited two hours behind the proofs and never ran. Run an investigation first, or give it a slot of its own for a set time, never behind a workflow.
- Before calling a run a hang, read where it lives. Ringwood, New Jersey's race-2 "stall" (Nov 1) was path-check living 22 months in one call with no progress lines while the heap grew about 70 MB a minute: a memory problem, not a loop.
- A process whose memory sits flat at its heap cap with no output is not stuck in a loop: the collector is thrashing at the limit (Ringwood, New Jersey, Nov 1: 8.4 GB, flat for 40 minutes). Read records per table, which `speed:year --out` writes for each year, to see what grows.
- A probe script that builds its own world must build the same one `speed:year` plays: `buildBenchWorld(drawPlace(seed, "speed-year").seed, gameStartDate(), { twoLevel: true, placeKey })`, not `buildBenchWorld(seed, …)`. On Nov 4 three Arcadia, California probes built from the bare seed and measured a lighter world (an election-year log of 224,834 rows against `speed:year`'s 342,693, and a 2.3 GB heap in early 2028 against 3.8 GB at the app's limit), so their month-by-month numbers had to be withdrawn.
- A heap snapshot at the limit (`--heapsnapshot-near-heap-limit`) needs about as much memory again to write; at a 4,096 MiB heap in a cloud container the process was killed while writing (exit 137, an empty file, Nov 4). Count records per table and their estimated bytes instead.

## Prove it changes nothing

- `--proof-out` writes dev mode's records proof (`src/bench/dev-proof.ts`): a digest per table over everything a world keeps, every core table, engine table and engine runtime part, the counted population included. The receipt's fingerprint is that digest.
- Take both proofs on the same main: merge one pinned main commit into the branch, run that main and the branch one after the other, same seed and years. `compareProofs` names each differing table, its row counts and the first differing id.
- A pure speed cut shows 0 differing tables. A fold shows only its own tables.
- A unit test with its own small world proves an edge, never sameness in play.
- A behavior change (not a cut) gives the records proof's count of differing tables and why, and compares the item's own records one by one against main. On Nov 1 the evicted-counted change differed in 287 tables, because thousands fewer people were filled in, but the first removal day's 140 case ids and placements matched main exactly.
- Pin one main for a batch of units, so one main baseline proof serves all of them. A unit stacked on another branch is proved against that branch's own proof, so only its own tables differ.
- When a checker suspects a branch makes a test that fails by draw fail more often, prove it in the checker's own places: `speed:year --place <key> --years 1 --proof-out` on main and on the branch, one pair per place. Equal digests in every place settle it, and say more than rerunning the test (Nov 1: the drives branch in four places).

## Find exact cuts

- Read a profile by inclusive time under one engine's entry, then ask what is computed again with the same inputs. Patterns that paid on Oct 29 and 30: a value recomputed inside a sort comparator (town halls, about 4%); an id search that tries every id taken that day (`keepWeighing`, 12% of a presidential year); a person built twice to read an id; a list sorted again though it only grows at its end; a per-call closure, which tsx names at run time (`keepNames`); a check that only tests need, run in play.
- A list grown by spreading itself for each item, `map.set(k, [...(map.get(k) ?? []), x])`, is quadratic in the group's size: the medical bills' grouping of about 20,000 counted households a month cost 11 s of a profiled year (Long Hill, Connecticut, seed m7b) and took year 1 from +7% to +31% against its base. Push into the list (Nov 1, 03873cbf37; records proof identical).
- What keeps a cut exact: the same reads in the same order (a first read can write, as an opening stance does), the same draws, the same float operations in the same order. A cache is keyed on everything it reads, lives beside the state (a `WeakMap` keyed by the world or store), never in a saved field, and resets when what it reads changes (the date, a table's write count). A check that only guards may skip in play under `bookkeeping()`; under bookkeeping, which tests run, it runs as before, or the old path runs beside the new one and must agree.
- After merging main into a speed branch, check each new store method or write path against every counter or index the old one now updates. On Oct 30 an owned put added beside `put` skipped the store write count main had just added for the laws cache; the records proof stayed identical, a verifier caught it, and a test that fails without the count fixed it.
- Have a second agent review each cut for exactness from the diff and the code before the PR, then prove it with the records proof.

## Fold what grows

- Under the Oct 30 01:55 ruling (keep what play reads, summarize the rest once it closes) the CTO ruled at 04:14 that folds are built, not asked: agree each reader's window with its owner (`docs/coordination/CREW.md`), and go ahead on a yes or after an hour with no answer. Name the readers and windows in the PR body. One fold per PR.
- For the campaign and voting tables, `governing-measurement` lists which are per race and which are per person. Impressions are one row per voter and person, carried across races, so they never fold at a race's close.
- Sweep every reader of the table, its indexes and its query functions. The dev trace's `findRecord` reads any engine table by id, so a row moved to another table of the same engine is still found.
- Before proposing a fold, read the engine's own retention: `decision-detail.ts` already drops circle-only log records after `circleActRetentionMonths` (`retainLog` queues them). A reader sweep lists who reads, not what is already dropped; on Oct 30 an event-log fold that already existed went to four owners and had to be withdrawn.
- The fold's test reads the same answers before and after (a standing, a scene's check), and folding twice changes nothing. Its records proof differs only in the folded tables.
- Map every reader before proposing a fold, then have a second agent check the map. On Nov 1 every check found readers the map had missed:
  - a town hall row keeps each attendee's cause id;
  - campaign summaries share an id with impressions, so the trace never reaches them;
  - opening-era promises and attack-ad viewers read promise facts;
  - a closed race's messages are still read for one window, because filings stay on the ballot after the count.
    Send each owner only their part, with file and line.
- A folded row can live inside a summary. The CTO ruled (Nov 1, 23:40, OWNER-DECISIONS) that dev mode's `findRecord` resolving a folded term or race id to its entry in its seat's summary meets "the trace reaches any table by id". The conditions:
  - each entry keeps every field a reader reads;
  - the player's own town, and every race or term the player, their household or their circle took part in, stay as rows;
  - each reader's window is agreed first;
  - the proof shows screens, scenes, cards and the trace reading the same.
- Fold into totals, not to nothing, when a reader may want the amounts. Itemized cash receipts fold into per-person, per-kind yearly totals (CTO, Nov 1). Open obligations, observer rows, and any receipt a kept fact, pledge or law's chain proof names, stay.
- Before calling a table a grower, check whether it keeps a row per event or a row per thing. Medical bills put each month's bill under the household's own id, so the table holds one row per household however long the save runs (Nov 1).
- When a merged feature may grow records, run `speed:year --out` on the merge commit's two parents and compare records per table, year by year. On Nov 1 that showed seating every legislature adds office terms and race returns every election, not once per seat: Kirkman, Iowa, 367,386 to 454,608 records at year 4.
- What grew in a Ringgold, Louisiana save by year 18 (runner, Nov 1, before round four's folds): folded campaign causes 611,382, door rows 454,211, the event log 349,804, itemized cash receipts 211,013 and campaign money 84,040. Both the base and the lives branch died of a full 8 GB heap in year 19. The player's circle grows over time, so anything kept per circle member grows with it.
- Totals that only grow overflow: the money journal's lifetime totals passed 2^53 cents in year 7 and now go to `bigint` past the safe range.

## Work another session adds to every day

When a session builds work that runs for many people (relatives elsewhere, the counted population, a new engine), it holds the bar this way. Send the session this section's name rather than explaining it in a message.

- No fill-in: filling someone in costs about 20 ms (past work, school history, pre-start history), and every engine that walks full people slows with them. In Storrs, Connecticut (Nov 1), filling in 4,000 evicted people cost 86 s directly and made garbage collection alone 282 s of the next year.
- A cadence keyed on a due date from an index (a monthly calendar entry, a queue by date registered as a snapshot world map part), never a daily scan of everyone or of all history.
- Everything it writes is bounded: folded or dropped once no reader needs it, or a 100-year save grows without limit.
- Measured with `speed:year` on main and the branch, one process at a time, alternating twice before quoting a percentage: `--out` gives each year's seconds, heap and records per table, and `--proof-out` names every table that differs, each of which the PR explains.
- When a unit's people send news into the town, the proof differs in hundreds of tables, because relatives hear it and act. Ask the unit's session for an ablation: the feature running with its events silenced, against the feature switched off. If those two differ only in the unit's own tables, every other difference is news reaching people, and the unit is clean on speed. If not, compare two worlds day by day to find the first difference. On Nov 1, lives unit 4's first difference was a new partner counted as a resident of their state, which moved a household's arrival day.
- An inclusive profile share is not a saving. Nov 8: two cuts aimed at 7 s of a small town's year 1 (floor amendments in other states' chambers, and the per-bill values every legislator reads) left the year unchanged on a quiet machine (Dickey, North Dakota, seed n8g7: 40.0 s before, 41.6 s after; 40.4 s with amendments skipped, 41.1 to 42.4 s). The work moved to the next reader of the same positions. Time a cut with three alternating pairs before building it into a PR, and drop it if the median does not move.
- Count first, then cut the volume: a birthday rebuilding a whole counted news group (1,241 of 1,691 rebuilds in Smackover's year 1) and a candidate holding an event here every day (1,134 a year) were the two cuts that paid, and both were found by counting calls, not by reading the profile.

## Read one election year (Nov 8, Speed)

- `node --import tsx scripts/speed-years/profile-year.ts --place <key> --seed <s> --year 4 --out <file>` profiles only that year of the `speed:year` world (earlier years run unprofiled); `--fast 1` profiles it in fast-forward. Read the file by inclusive time per function and per file, then by the callees of the one biggest engine.
- Before cutting code, count the volume (temporary counters in a scratch copy, never committed): Upper Witter Gulch's election year held 1,134 town halls at about 240 microseconds a listener, so the cost was how many events, not how fast each ran. A cut of the volume by a realistic rule (a district candidate's events reach a town in proportion to its share of the race's voters, with no dice) took year 4 from 151.7 to 88.5 s.
- To compare a cut against base in one place and seed, keep the switch in a sparse worktree (`git worktree add --no-checkout`, cone sparse-checkout of `src scripts data docs/release tooling`, `node_modules` symlinked) and read it from an environment variable there; the branch itself stays clean. Run base and cut one after the other, never at once.
- `scripts/speed-years/fast-forward.ts` runs the world with fast-forward on or off and lists each race the town votes in (office, winner, top two shares). Races in the voting results table whose contest is not in the town's contests are other places' races.
- A single slowdown reading is not a finding. Re-time it alternating against the base (three pairs, median) and profile both before anyone acts on it: on Nov 8 a +10% reading of a monthly pass in year 1 (Dickey, North Dakota, seed n8g7) did not reproduce on current main (40.3 s before, 39.9 s after), and the profile showed the pass costing nothing in year 1.

## Long saves

- A 100-year save needs a machine of its own: the long-run runner session (`CREW.md`) runs it and sends year lines. `speed:year` writes its receipt as each year ends, with each year's heap, process memory and records kept, so a killed run keeps its marks.
- A measurement branch that merges unmerged fixes is merged by commit: take each head from `git ls-remote origin <branch>` and merge that SHA, since a helper copy's `origin/<branch>` can be stale.
- **A restored world that drifts from its original** (unit 9, Nov 4). Run a control first: two fresh builds of the same world, no save, played the same days. Only what differs in the save run and not in the control is the save's (two worlds in one process share the stopgap recorder, so `core.stopgapHits` differs in both). Then find the first day and field that split, and look for state the save doesn't hold:
  - A `WeakMap` or `WeakSet` keyed by the world that holds state across days (a mark such as "seeded" or "last roster size") becomes a saved part with `registerWorldMapPart`.
  - A cache built from the world's records becomes `registerDerivedCache`.
  - A cache keyed by records inside the world (a person, a traits object), which the restore refills in place, registers its reset with `registerRestoreReset`.
  - To find which one, patch `globalThis.WeakMap` in the probe before anything else is imported. Record where each map was made and which keys it set before the restore, clear chosen ones after, and halve the set. Clearing every map breaks the world, because module state and the cash host live in maps too.
  - When the split is a record that exists in only one world, wrap that world's Map `set` to print the stack that first writes the key.

## Memory: find the cause before the fold

- Count the growing table by kind and by the cause of its latest change in the world `speed:year` plays, before believing a brief's cause or building a fold. On Nov 8 the brief blamed "coworker" ties made when a hire meets every coworker; Montpelier, Vermont (key 5046000, seed mont1) showed the `coworker` kind flat at about 18,300 and year 2's growth in `met-in-group` ties (22,978), made by `meetAtJoin` meeting every member of every group joined. `met-at-work` made 114.
- Fixing a cause can shrink tables that never looked related. The player's circle is the people the player's people know, so capping who a join introduces (`knownAmong`, a power law of the group's size) also cut Montpelier's `durableLog` at year 2 from 82,667 to 38,637, and the election year's heap from 7.7 GB at year 4 to 2.8 GB.
- A log count taken in January includes the circle rows from the November election that `circleActRetentionMonths` (3) has not dropped yet. Compare the same month across years, and read heap after a collection, not the row count alone.

- `npm run speed:year` draws a new place from its seed each run, and a place's size moves a year by two to three times (Nov 8: the same code read 41 to 118 seconds in year 1 across six runs). To compare a branch with main, pass the same `--seed <s>` to both, one process alone, and name the place and seed. A table read that scans every row of a monthly-growing table inside a per-race or per-person call (`rows()` in a hot function) is a cost; keep the latest id on the state row and `get` it.

## Stop condition

Done when every timed claim names the place, seed, years and machine, every speed PR carries an identical records proof (or a fold's named tables), and the item's done-when lines each have that evidence.

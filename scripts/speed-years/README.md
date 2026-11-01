# Measure the played world's years

`npm run speed:year -- --seed <s> [--place <key>] [--years 4] [--max-seconds 300]` builds the bench's played world (`buildBenchWorld`, two-level, every module), turns the debug bookkeeping off as play does, advances it one year at a time with `advanceCore`, and prints the build seconds and, for each year, its seconds, the heap and process memory after a collection, and the records the world keeps, saving the receipt as each year ends. It runs four years unless `--years` says otherwise, so every check holds an election year; the 120-second bar applies to each year (CTO, Oct 30). A long run (`--years 100`) shows whether a save grows. It exits 1 when a year runs over `--max-seconds`. The place is drawn from all 56 by the seed unless `--place` names a key. The game's own limit is 120 seconds a year; a change may make a year no more than 20% slower than its base. Node runs with the young-generation size (`--max-semi-space-size`) that `scripts/core2-guard/policies.json` (`nodeSemiSpaceMiB`) and the desktop play server use, so the year is measured the way play runs it; `compare.test.ts` fails when the two differ.

Each year's fingerprint is dev mode's records proof (`src/bench/dev-proof.ts`): one digest per table of what the world keeps, read from the same list a snapshot saves (`worldRecords` in `src/core2/snapshot.ts`: the core's records, every engine's tables and every engine's runtime part, the counted population among them), taken after the clock stops. `--baseline <main receipt> --same-records` also exits 1 when a year's records differ from main's and names each table that differs; `--proof-out <file>` writes the last year's proof with every row's digest and prints the core seed, place and date, so dev mode can open the same world, save its own proof (`POST /api/dev/proof/save`) and compare (`GET /api/dev/proof/compare?name=`), which opens the first differing record's trace. Engines that have not declared their whole state saveable are listed, since the proof sees only their tables. A speed change ships only with identical proofs on a drawn place.

Run one process at a time on a quiet machine, through the storage wrapper for heavy jobs:

```sh
npm run storage -- run test -- npm run speed:year -- --seed <s>
```

## Other tools here

- `compare.ts` compares two timing receipts (`compare.test.ts` covers it).
- `profile.mjs` summarizes a V8 CPU profile (`node --cpu-prof ...`) into the 25 functions with the most inclusive time and the 25 with the most self time.

The paired month and process guards live in `scripts/core2-guard/` (see its README).

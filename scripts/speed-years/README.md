# Measure a town year

`npm run speed:year -- --seed <s> [--place <key>] [--years 1] [--max-seconds 300]` builds the bench's played world (`buildBenchWorld`, two-level, every module), turns the debug bookkeeping off as play does, advances it one year at a time with `advanceCore`, and prints the build seconds and each year's seconds. It exits 1 when a year runs over `--max-seconds`. The place is drawn from all 56 by the seed unless `--place` names a key. The game's own limit is 120 seconds a year; a change may make a year no more than 20% slower than its base. Node runs with the young-generation size (`--max-semi-space-size`) that `scripts/core2-guard/policies.json` (`nodeSemiSpaceMiB`) and the desktop play server use, so the year is measured the way play runs it; `compare.test.ts` fails when the two differ.

Each year's fingerprint is dev mode's records proof (`src/bench/dev-proof.ts`): one digest per core and engine table, taken after the clock stops. `--baseline <main receipt> --same-records` also exits 1 when a year's records differ from main's and names each table that differs; `--proof-out <file>` writes the last year's proof with every row's digest, so two builds' files name the first record that differs, and dev mode's `POST /api/dev/proof/compare` opens that record's trace. A speed change ships only with identical proofs on a drawn place.

Run one process at a time on a quiet machine, through the storage wrapper for heavy jobs:

```sh
npm run storage -- run test -- npm run speed:year -- --seed <s> --years 3
```

## Other tools here

- `compare.ts` compares two timing receipts (`compare.test.ts` covers it).
- `profile.mjs` summarizes a V8 CPU profile (`node --cpu-prof ...`) into the 25 functions with the most inclusive time and the 25 with the most self time.

The paired month and process guards live in `scripts/core2-guard/` (see its README).

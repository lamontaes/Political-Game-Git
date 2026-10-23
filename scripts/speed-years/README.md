# Measure a town year

Current as of 2026-10-23 (checked by the Oct 23 doc audit: every path resolves and no replaced rule is stated)

`npm run speed:year -- --seed <s> [--place <key>] [--years 1] [--max-seconds 300]` builds the bench's played world (`buildBenchWorld`, two-level, every module), turns the debug bookkeeping off as play does, advances it one year at a time with `advanceCore`, and prints the build seconds and each year's seconds. It exits 1 when a year runs over `--max-seconds`. The place is drawn from all 56 by the seed unless `--place` names a key. The game's own limit is 120 seconds a year; a change may make a year no more than 20% slower than its base.

Run one process at a time on a quiet machine, through the storage wrapper for heavy jobs:

```sh
npm run storage -- run test -- npm run speed:year -- --seed <s> --years 3
```

## Other tools here

- `compare.ts` compares two timing receipts (`compare.test.ts` covers it).
- `profile.mjs` summarizes a V8 CPU profile (`node --cpu-prof ...`) into the 25 functions with the most inclusive time and the 25 with the most self time.

The paired month and process guards live in `scripts/core2-guard/` (see its README).

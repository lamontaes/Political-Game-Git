---
id: release-red-death-taxes-rate-only-kentucky-government-heir
title: "The death-tax test 'setting only a rate' is red on the Train: Kentucky's government-heir reading is not marked"
area: laws
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
root: none
lead: laws
model: sonnet
effort: medium
source: "found by T54 gating world-counted-renters-buy (#9117), Nov 15; red the same on the clean Train 88b5b879"
---

**What.** `src/core2/laws-death-taxes.test.ts`, "a state that adopts a death tax by setting only a rate taxes the whole amount at that rate", fails with `US-KY: expected false to be true`: when a government inherits from a Kentucky estate, the test expects the stopgap `SG-LAW-government-heir-exempt-assumed` to be hit, because the starting law's Kentucky inheritance-tax row carries a `governmentHeir.reading`, and it is not hit. The test's own seed comes from `Date.now()` unless `GOLDEN_PATH_SEED` is set, so it also draws a different state and place each run. Guards: the government-heir terms of every state's inheritance tax.

**Cause.** Measured: red on the clean Train at 88b5b8796aae165be2228c7b8b614707dcd7d390 with `npx vitest run src/core2/laws-death-taxes.test.ts -t "setting only a rate"` (16.8 s), and on #9117's head. Which of `assessInheritanceTax`'s paths for a government heir stopped calling `api.stopgap(...)` for a marked reading is not yet traced. Needs cause.

**Fix.** Needs cause. First step: on 88b5b879, call `assessInheritanceTax(api, "US-KY", GOVERNMENT_HEIR, 1_000_000_00)` after enacting Kentucky's starting row and read which branch returns 0 without the stopgap call; then pin the test's seed and place in the file.

**Time box.** 2 hours for one Sonnet session at medium effort. When it runs out, write what was read here and stop.

**Rules.** Pinned tests: the test names its state, place and seed in the file instead of drawing one from the clock. Estimate, never UNKNOWN: a marked reading stays marked until a statute replaces it.

**Done when.** The test passes on a fixed seed and a named place in the file, and the Kentucky government heir hits the stopgap again, by its id. A second session, at a drawn place in Kentucky it names with its seed, sees in dev mode's Trace for an estate left to the town that the exemption is marked as a reading.

**Waits on.** Nothing.

**Files.** src/core2/laws-death-taxes.test.ts, src/core2/laws-death-taxes.ts

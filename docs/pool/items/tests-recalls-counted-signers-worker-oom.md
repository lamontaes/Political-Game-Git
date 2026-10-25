---
id: tests-recalls-counted-signers-worker-oom
title: "recalls.test: the counted-signer tests run the test worker out of memory on main"
area: gov
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The two tests in src/core2/recalls.test.ts that count the town's counted residents as signers and voters (whole and fractional weights) never finish: the vitest fork worker exits with a JavaScript heap out of memory error after about two minutes, with NODE_OPTIONS=--max-old-space-size=6144 and without it. It happens on main as merged October 23, 2026, not only on a branch, so the file's two other tests pass and these two are never checked. Find what each test holds that grows (a whole town built per attempt, kept references between attempts, or a year of records) and bring it under the worker's heap, so the counted-signer rule is checked again on every change to recalls.

**Rules.** One model, two tiers: the counted-signer tests are what prove a counted voter row counts by its weight, the same rule as a full person, so they must run. Speed: a test builds the smallest world that proves its claim, never one that outgrows the worker.

**Done when.** npx vitest run src/core2/recalls.test.ts passes all four tests in one run on a clean checkout, with each counted-signer test naming its drawn place, seed and the recall record id whose signatures and votes it summed, and the worker stays under its heap limit.

**Files.** src/core2/recalls.test.ts, src/core2/modules/recalls.ts

**Notes.** TODO

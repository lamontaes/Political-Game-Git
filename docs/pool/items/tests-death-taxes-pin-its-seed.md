---
id: tests-death-taxes-pin-its-seed
title: "The death-tax test draws its seed from the clock each run"
area: world
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
lead: laws
source: story builder thread, Nov 16, the Account lead's ask on the reds of #9604
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** The death-tax test builds its world from a seed hashed from the clock, so no two runs are the same world. Its red, Kentucky's rate-only death tax, comes on every draw and has its own item. Seen: red with seed d58fc8ef (place in North Carolina) with and without #9604.

**Cause.** Found in code: src/core2/laws-death-taxes.test.ts line 34 hashes `death-taxes:${Date.now()}` when `GOLDEN_PATH_SEED` is unset. Measured: at North Carolina place 3741720, seed d58fc8efd5dfd19cf849ed08cae60e8800652ad57bc05f203c070d516079808b, by `npx vitest run src/core2/laws-death-taxes.test.ts`, "US-KY: expected false to be true", the case of release-red-death-taxes-rate-only-kentucky-government-heir.

**Fix.** Pin the test to named places with fixed seeds (skill `pinned-tests`), the seed above among them. The Kentucky red is fixed under release-red-death-taxes-rate-only-kentucky-government-heir, not here.

**Time box.** 1 hour.

**Rules.** One rule, all 56 places: pinned places are named in the test, never in logic.

**Done when.** A second session runs the pinned test twice and it builds the same named worlds both times. A drawn place, North Carolina 3741720 (seed d58fc8ef), is among them.

**Waits on.** release-red-death-taxes-rate-only-kentucky-government-heir for green.

**Files.** src/core2/laws-death-taxes.test.ts

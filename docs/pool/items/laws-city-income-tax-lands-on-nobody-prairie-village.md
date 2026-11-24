---
id: laws-city-income-tax-lands-on-nobody-prairie-village
title: "A new city income tax in Prairie Village, Kansas lands on no worker as a felt change"
area: laws
kind: bug
priority: 2
size: S
status: merged
standard: 2
claimed-by:
pr: #9327
after:
blocked-on:
lead: laws-effects
source: "Account lead laws thread, Nov 15, 2026, running src/core2/tax-change-lands.test.ts beside the Social Security trace"
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
---

**What.** `src/core2/tax-change-lands.test.ts` is red on its pinned case: in Prairie Village, Kansas (2057575, world seed 8aadc4eadb2fce04f3477fe846529b657c108aa220a4db232645bdb8486b87b8) the state grants local income tax authority and the city enacts a 1% flat income tax; 60 days later no `law.effect-landed` event names the tax's law row ("no kept pay record changed"). Red with and without the Social Security change on train head 2190669e (replays 8c3210456999be81 and 7f76258a9ca0f474). A worker whose take-home pay drops never feels it, so the tax moves no mood or view. Seen: a named worker's Journal and views after a city income tax passes.

**Cause.** Measured: Prairie Village, Kansas (2057575), world seed 8aadc4eadb2fce04f3477fe846529b657c108aa220a4db232645bdb8486b87b8, `npx vitest run src/core2/tax-change-lands.test.ts -t "Prairie Village"` with a counter on each step of the withholding path, on the train at 53e4b29fe8: 626 withholding records carry a city income line after the tax begins and 94 workers get a `law.effect-landed` event that names the tax's law row, so the test passes. The red at 2190669e was fixed by the next fold, pull request #9327 ("Make a felt change from a new tax count only the law's own line of pay", folded at ae91dc17da), found by a bisect over the train's folds. Its two causes are written in its own item, `tests-tax-change-lands-prairie-village-ks-no-pay-change`: nobody's pay record was kept because the test put no one in focus, and `landWithholdingChange` compared a paycheck with the last of any kind. This item is that item's twin.

**Fix.** Built by pull request #9327: `landWithholdingChange` (src/core2/modules/budgets.ts) compares a paycheck with the last one of the same kind and measures only the changed law's own line, and the test puts workers in focus. A named worker's take-home pay drop now lands as a felt change.

**Time box.** 2 hours for one Opus session at medium effort.

**Rules.** No dice. Ask why. Pinned tests: never loosen the test.

**Done when.** A second session runs `npx vitest run src/core2/tax-change-lands.test.ts` on main and the Prairie Village case passes, naming a worker who felt the tax, and the test's drawn city case passes in the drawn place it names.

**Waits on.** Nothing.

**Files.** src/core2/tax-change-lands.test.ts, src/core2/modules/budgets.ts, src/core2/budgets-treasury.ts

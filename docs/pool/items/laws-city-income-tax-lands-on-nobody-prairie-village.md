---
id: laws-city-income-tax-lands-on-nobody-prairie-village
title: "A new city income tax in Prairie Village, Kansas lands on no worker as a felt change"
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
lead: laws-effects
source: "Account lead laws thread, Nov 15, 2026, running src/core2/tax-change-lands.test.ts beside the Social Security trace"
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
---

**What.** `src/core2/tax-change-lands.test.ts` is red on its pinned case: in Prairie Village, Kansas (2057575, world seed 8aadc4eadb2fce04f3477fe846529b657c108aa220a4db232645bdb8486b87b8) the state grants local income tax authority and the city enacts a 1% flat income tax; 60 days later no `law.effect-landed` event names the tax's law row ("no kept pay record changed"). Red with and without the Social Security change on train head 2190669e (replays 8c3210456999be81 and 7f76258a9ca0f474). A worker whose take-home pay drops never feels it, so the tax moves no mood or view. Seen: a named worker's Journal and views after a city income tax passes.

**Cause.** Needs cause. The landing is written by `landWithholdingChange` from the withholding record (src/core2/modules/budgets.ts, `keepsWhy` guard) through `landTaxChange` (src/core2/budgets-treasury.ts); not yet followed: whether the city tax reaches the withholding lines at all in this place, or only `keepsWhy` drops every worker.

**Fix.** None until the cause is found.

**Time box.** 2 hours for one Opus session at medium effort.

**Rules.** No dice. Ask why. Pinned tests: never loosen the test.

**Done when.** A second session runs `npx vitest run src/core2/tax-change-lands.test.ts` on main and the Prairie Village case passes, naming a worker who felt the tax, and the test's drawn city case passes in the drawn place it names.

**Waits on.** Nothing.

**Files.** src/core2/tax-change-lands.test.ts, src/core2/modules/budgets.ts, src/core2/budgets-treasury.ts

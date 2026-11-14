---
id: tests-law-wiring-taxes-reserve-has-no-journal-entry
title: "law-wiring-taxes: the minimum reserve balance law has no journal entry in some towns"
area: laws
lead: laws
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
source: found by the Account lead's tax-wiring thread, Nov 14
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
---

**What.** `GOLDEN_PATH_SEED=cc33 npx vitest run src/core2/law-wiring-taxes.test.ts` fails at Kalona, Iowa (1940170): "no journal entry names a minimum-reserve-balance row: applied|us-policy-positions:fiscal.minimum-reserve-balance|US-IA government 0 of 1". The one applied row targets the state government and records 0 minor, so no journal posting names it. Seeds aa11 (Burlington, MA) and bb22 (Gas, KS) pass. Seen: the state budget's reserve line, which shows no money moving for a reserve law in force.

**Cause.** Measured: at Kalona, Iowa (1940170) with GOLDEN_PATH_SEED=cc33 (npx vitest run src/core2/law-wiring-taxes.test.ts), the reserve law's only applied row in that run is a zero-amount row on the state government; the test's chain requires a posting. Whether the engine should move money (top up a reserve below the minimum) or the test should accept a law applied with nothing due (as `assessEstateTaxes` records an estate under its exemption) is not yet read from the budgets code.

**Fix.** Read where `us-policy-positions:fiscal.minimum-reserve-balance` is applied in src/core2/modules/budgets.ts; if the state's reserve was already above the minimum, record that as an applied row with its balance and have the test name the reserve account's balance instead of a posting; if the reserve was below the minimum and nothing moved, make the budget engine transfer the shortfall through the existing treasury account. Pin the test to Kalona, Iowa with seed cc33 beside the drawn case.

**Time box.** 3 hours for one Sonnet session; push what passes and stop.

**Rules.** No dice; the engine that pays reads the law. Do not loosen the money assertion for places where a reserve is below its minimum.

**Done when.** A second session replays it in the running game: in dev mode at a drawn place (Kalona, Iowa, 1940170, seed cc33, is the failing one) it puts the minimum reserve balance question in force at the state, plays a year, and reads on the state budget screen either a reserve top-up with its journal entry or the reserve balance above the minimum. Seeds aa11, bb22 and cc33 pass src/core2/law-wiring-taxes.test.ts, each in about a minute, with the reserve row's id and its journal entry or balance read named in the PR body.

**Waits on.** Nothing.

**Files.** src/core2/modules/budgets.ts, src/core2/law-wiring-taxes.test.ts

**Notes.** Filed on the nine-links-taxes thread branch.

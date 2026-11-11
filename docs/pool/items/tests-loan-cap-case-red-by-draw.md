---
id: tests-loan-cap-case-red-by-draw
title: "The consumer loan cap case in the housing and credit law test fails on main in some drawn places: no household quoted under the cap is lent to"
area: laws
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
lead: laws-effects
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
checked: fable 2026-11-10
---

**What.** On main at ccbdcc4936, the case "cap consumer loan rates: each quoted household is recorded and lent to under the ceiling" in src/core2/law-wiring-housing.test.ts fails with GOLDEN_PATH_SEED=c443c640669c9f2eb72d974b0cf926a6305a74b0 (Bel Air South, Maryland, 2405950) and, at dad79530a4, with 7fba587294c64f3fe78585f25bdf6a254161c880 (Henderson, Nevada): "no household quoted under the cap was lent to through the journal". The unit job draws a fresh seed each run, so any PR that touches this file can go red on it. The case has no pass-over for a place where no quoted household borrowed, and why none borrowed is not found. Guards: a household's loan under the rate cap the player passes shows on its card in every town.

**Cause.** Needs cause. Looked at the cap case near line 833 of src/core2/law-wiring-housing.test.ts and the lending code in src/core2/modules/credit.ts: no pass-over exists, and the reason no quoted household borrowed in these two towns was not read. Measured: GOLDEN_PATH_SEED=c443c640669c9f2eb72d974b0cf926a6305a74b0 (Bel Air South, Maryland) and 7fba587294c64f3fe78585f25bdf6a254161c880 (Henderson, Nevada).

**Fix.** None until the cause is found.

**Time box.** 3 hours.

**Rules.** An effect is a read, not a record: the cap is wired only where a quoted household's loan is made under the ceiling, or the test names by record why no household borrowed. No dice: the fix finds the cause, never retries a seed. One rule, all 56 places.

**Done when.** A second session runs the cap case with GOLDEN_PATH_SEED=c443c640669c9f2eb72d974b0cf926a6305a74b0 in the drawn place Bel Air South, Maryland and sees it pass, naming the loan's journal record id or the recorded reason no quoted household borrowed, and then on three fresh random seeds. The cause is named in the PR body with file and line.

**Waits on.** Nothing.

**Files.** src/core2/law-wiring-housing.test.ts, src/core2/modules/credit.ts

**Notes.** lead: laws-effects. Filed Oct 28 by the laws-and-effects lead. Related stopgap: the cap binds only the bank's consumer loan (world-small-dollar-lenders).

**Notes (re-run, 2026-11-10, main b4422d346c).** npx vitest run src/core2/law-wiring-housing.test.ts --maxWorkers=1 with OCD_STORAGE_OVERRIDE and NODE_OPTIONS=--max-old-space-size=8192, GOLDEN_PATH_SEED=c443c640669c9f2eb72d974b0cf926a6305a74b0 and, separately, 7fba587294c64f3fe78585f25bdf6a254161c880. Neither run finished inside the 30-minute limit (exit 124, no assertion printed), so neither is called red or green; the whole file is slow. A second run of only the cap case (`-t "cap consumer loan rates"`, GOLDEN_PATH_SEED=c443c640669c9f2eb72d974b0cf926a6305a74b0, 29-minute limit) also ended with exit 124 and no assertion, so the case alone does not finish in 30 minutes. The same single-case run on GOLDEN_PATH_SEED=7fba587294c64f3fe78585f25bdf6a254161c880 also ended with exit 124 and no assertion. Next: a run with a longer limit by someone allowed more time, printing progress to stderr.

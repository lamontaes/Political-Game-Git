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
after: core-country-tier-empty-sector-prices-run-away-in-dc
lead: laws-effects
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
checked: fable 2026-11-10
---

**What.** On main at ccbdcc4936, the case "cap consumer loan rates: each quoted household is recorded and lent to under the ceiling" in src/core2/law-wiring-housing.test.ts fails with GOLDEN_PATH_SEED=c443c640669c9f2eb72d974b0cf926a6305a74b0 (Bel Air South, Maryland, 2405950) and, at dad79530a4, with 7fba587294c64f3fe78585f25bdf6a254161c880 (Henderson, Nevada): "no household quoted under the cap was lent to through the journal". The unit job draws a fresh seed each run, so any PR that touches this file can go red on it. The case has no pass-over for a place where no quoted household borrowed, and why none borrowed is not found. Guards: a household's loan under the rate cap the player passes shows on its card in every town.

**Cause.** Needs cause. Looked at, and ruled out so far: the cap rows (`interest-capped`, src/core2/modules/credit.ts line 1465) name the loan's household (`targetId: loan.householdId`), and a loan's journal ref is `loan:<household id>:<date>` or `loan:small-dollar:<household id>:<date>` (credit.ts lines 1774 and 1855), the same prefixes the test matches (src/core2/law-wiring-housing.test.ts lines 812 to 829), so a mismatch of ids is not the cause. The case could not be read on main: the whole file plays one shared world for `HOUSING_DAYS` (700 days, line 73) in its `beforeAll` (line 1042), and with GOLDEN_PATH_SEED=c443c640669c9f2eb72d974b0cf926a6305a74b0 (Bel Air South, Maryland) `npx vitest run src/core2/law-wiring-housing.test.ts --maxWorkers=1 -t "cap consumer loan rates"` ran 90 minutes (exit 124, Nov 11, main 8c980a59) without reaching the cap block, where a probe was waiting to list the cap rows and loans. The hook's own 30-minute limit (line 1094) cannot stop it, because the year is played synchronously. Not yet known: whether any quoted household in Bel Air South borrowed after the cap took effect.

**Fix.** None until the cause is found.

**Time box.** 3 hours for one Opus session: first a run that finishes (see the Notes), then the cause. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: the cap is wired only where a quoted household's loan is made under the ceiling, or the test names by record why no household borrowed. No dice: the fix finds the cause, never retries a seed. One rule, all 56 places.

**Done when.** A second session runs the cap case with GOLDEN_PATH_SEED=c443c640669c9f2eb72d974b0cf926a6305a74b0 in the drawn place Bel Air South, Maryland and sees it pass, naming the loan's journal record id or the recorded reason no quoted household borrowed, and then on three fresh random seeds. The cause is named in the PR body with file and line.

**Waits on.** core-country-tier-empty-sector-prices-run-away-in-dc: the housing file's draw lands in Washington, D.C. often, and a world there crashes before the cap case can be read.

**Files.** src/core2/law-wiring-housing.test.ts, src/core2/modules/credit.ts

**Notes.** lead: laws-effects. Filed Oct 28 by the laws-and-effects lead. Related stopgap: the cap binds only the bank's consumer loan (world-small-dollar-lenders).

**Notes (re-run, 2026-11-10, main b4422d346c).** npx vitest run src/core2/law-wiring-housing.test.ts --maxWorkers=1 with OCD_STORAGE_OVERRIDE and NODE_OPTIONS=--max-old-space-size=8192, GOLDEN_PATH_SEED=c443c640669c9f2eb72d974b0cf926a6305a74b0 and, separately, 7fba587294c64f3fe78585f25bdf6a254161c880. Neither run finished inside the 30-minute limit (exit 124, no assertion printed), so neither is called red or green; the whole file is slow. A second run of only the cap case (`-t "cap consumer loan rates"`, GOLDEN_PATH_SEED=c443c640669c9f2eb72d974b0cf926a6305a74b0, 29-minute limit) also ended with exit 124 and no assertion, so the case alone does not finish in 30 minutes. The same single-case run on GOLDEN_PATH_SEED=7fba587294c64f3fe78585f25bdf6a254161c880 also ended with exit 124 and no assertion. Next: a run with a longer limit by someone allowed more time, printing progress to stderr.

**Notes (cause finder, Nov 11, 2026, for Fable B).** The next step is a run that finishes: set `HOUSING_DAYS` lower (the cap only needs the months after the law is put in force, read where `setQuestion` puts the cap) or give the run the hours it needs as one heavy run (the heavy-runs skill), with a probe after the year that writes, for the cap law: the cap rows by target and `what`, the household loans posted after the law took effect (refs starting `loan:`), and how many of them belong to capped households. If the run cannot be made to finish in a CI unit job at all, that is its own item for the laws lead: the housing laws file plays 700 days of a drawn town and on this seed takes over 90 minutes.

**Notes (cause finder, Nov 11, 2026, second run, for Fable B).** I ran the file with `HOUSING_DAYS=240` (one heavy run, 1,854 seconds), GOLDEN_PATH_SEED=c443c640669c9f2eb72d974b0cf926a6305a74b0 and a probe at the cap block (since undone). The draw no longer gives Bel Air South for this seed; place draws have changed since the item was filed. The `beforeAll` (line 1056) plays up to 14 whole worlds, passing over each that turns out to have no subject only after playing it (`play` returns `no subject: ...`, lines 293 to 376). This run built eleven worlds: six in Washington, D.C., and Wilson, North Carolina; Prescott Valley, Arizona; Fuquay-Varina, North Carolina; Rock Hill, South Carolina; and Deltona, Florida. At 700 days a world, that loop is why a run takes over 90 minutes. The eleventh world, D.C. with seed c2ff19100a2c2f424292deca7b7fe760abec51ebe682d9ad572706e6ff3ae925, crashed with `Map maximum size exceeded`. Its cause is filed as core-country-tier-empty-sector-prices-run-away-in-dc, which this item now follows. Why the ten worlds were passed over was not printed (the crash came first), and the cap block was never reached, so this item's own cause is still not found. The next run should go after that fix, with the cap probe and a line per passed-over world.

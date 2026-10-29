---
id: tests-loan-cap-case-red-by-draw
title: "The consumer loan cap case in the housing and credit law test fails on main in some drawn places: no household quoted under the cap is lent to"
area: laws
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** On main at ccbdcc4936, src/core2/law-wiring-housing.test.ts case 'cap consumer loan rates: each quoted household is recorded and lent to under the ceiling' fails with GOLDEN_PATH_SEED=c443c640669c9f2eb72d974b0cf926a6305a74b0 (Bel Air South, Maryland, 2405950) and, at dad79530a4, with 7fba587294c64f3fe78585f25bdf6a254161c880 (Henderson, Nevada): 'no household quoted under the cap was lent to through the journal'. The unit job draws a fresh seed each run, so any PR that touches this file can go red on it. Found by the laws-and-effects lead on #6602, which does not touch the cap case.

**Rules.** AGENTS.md, an effect is a read, not a record: the cap is wired only where a quoted household's loan is made under the ceiling, or the test names by record why no household borrowed; no dice: the fix finds the cause, never retries a seed; one rule, all 56 places.

**Done when.** With GOLDEN_PATH_SEED=c443c640669c9f2eb72d974b0cf926a6305a74b0 the case passes in Bel Air South, Maryland, naming the loan's journal record id or the recorded reason no quoted household borrowed, and it passes on three fresh random seeds; the cause is named in the PR body with file and line.

**Files.** src/core2/law-wiring-housing.test.ts,src/core2/modules/credit.ts

**Notes.** lead: laws-effects. Filed Oct 28 by the laws-and-effects lead. Related stopgap: the cap binds only the bank's consumer loan (world-small-dollar-lenders).

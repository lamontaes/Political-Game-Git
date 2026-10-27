---
id: research-local-income-tax-authority-dc-territories
title: "D.C. and the five territories get a sourced row for whether their localities may levy an income tax"
area: laws
lead: laws
kind: research
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The starting law has a `local-income-tax-authority` row for each of the 50 states and none for D.C., Puerto Rico, Guam, the Virgin Islands, American Samoa or the Northern Mariana Islands (measured in `src/core2/data/laws/starting-law.json`, Oct 25). So where a local body there drafts an income tax, the legislature answers "state-gives-no-local-tax" from no row, and no law is recorded as read. Found by the laws lead when the taxes family test drew Marueño, Puerto Rico (seed 9c7e770e2a46c5dccabd59cb3672b93dd63dfe83); the test now redraws such a place. Research each of the six from its own law (the D.C. Home Rule Act; Puerto Rico's Municipal Code, Act 107-2020; each territory's organic act or constitution and code), quote the provision, and add the row through `scripts/research/build-starting-law.py`, ESTIMATED where no provision speaks to it.

**Rules.** Research before building: quoted sources, fetched. One rule, all 56 places. Estimate, never UNKNOWN.

**Done when.** `starting-law.json` holds a sourced or estimated `local-income-tax-authority` row for all six, each with its citation; the redraw for "a state local income tax authority row" in `src/core2/law-wiring-taxes.test.ts` is removed; and the test passes on a seed that draws one of the six (name it). **On screen.** None by design: this is a check, a speed or tooling change, or a cleanup; the player notices only that the game keeps running and the numbers stay believable.

**Files.** scripts/research/build-starting-law.py, src/core2/data/laws/starting-law.json, src/core2/law-wiring-taxes.test.ts

**Notes.** Laws lead, Oct 25, from PR #5649.

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
standard: 2
model: sonnet
effort: low
root: rc9-place-facts-one-default
after:
checked: fable 2026-11-10
claimed-at:
branch: claude/pool-research-local-income-tax-authority-dc-territories
---

**What.** The starting law has a `local-income-tax-authority` row for each of the 50 states and none for D.C., Puerto Rico, Guam, the Virgin Islands, American Samoa or the Northern Mariana Islands (measured in src/core2/data/laws/starting-law.json, Oct 25). So where a local body there drafts an income tax, the legislature answers 'state-gives-no-local-tax' from no row, and no law is recorded as read. The laws lead found it when the taxes family test drew Marueno, Puerto Rico (seed 9c7e770e2a46c5dccabd59cb3672b93dd63dfe83); the test now redraws such a place. Research each of the six from its own law (the D.C. Home Rule Act; Puerto Rico's Municipal Code, Act 107-2020; each territory's organic act or constitution and code), quote the provision, and add the row, ESTIMATED where no provision speaks to it. Seen: the bill menu, which answers 'no local tax' with no row in D.C. and the five territories.

**Cause.** Measured: src/core2/data/laws/starting-law.json has 50 `local-income-tax-authority` rows (the 50 states) and none for D.C., Puerto Rico, Guam, the Virgin Islands, American Samoa or the Northern Mariana Islands (laws lead, Oct 25; drawn place Marueno, Puerto Rico, seed 9c7e770e2a46c5dccabd59cb3672b93dd63dfe83).

**Fix.** Research each of the six places' rule on local income taxes with quote and URL, add the six rows through scripts/research/build-starting-law.py, remove the redraw in src/core2/law-wiring-taxes.test.ts, and make the test read the new rows.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** Research before building: quoted sources, fetched. One rule, all 56 places: the six rows live in starting-law.json keyed by place, never named in logic. Estimate, never UNKNOWN: where no provision speaks to it the row is ESTIMATED with its reason.

**Done when.** A second session opens src/core2/data/laws/starting-law.json and finds a sourced or estimated `local-income-tax-authority` row for all six places, each with its citation, and runs src/core2/law-wiring-taxes.test.ts on a seed that draws one of the six (named in the PR) with the redraw for 'a state local income tax authority row' removed, seeing it pass by record id in that drawn place. On screen: none by design.

**Waits on.** Nothing.

**Files.** scripts/research/build-starting-law.py, src/core2/data/laws/starting-law.json, src/core2/law-wiring-taxes.test.ts

**Notes.** Laws lead, Oct 25, from PR #5649.

Released (2026-11-11): Started, not finished: two of six places searched, none quoted from a fetched page yet. D.C.: Home Rule Act section 602(a)(5) bars taxing nonresidents' personal income (Bishop v. District of Columbia, D.C. Ct. App. 1980, law.justia.com/cases/district-of-columbia/court-of-appeals/1980/12871-0.html), and D.C. is itself one jurisdiction, so no local-income-tax authority row is a 0. Puerto Rico: municipalities tax by the municipal license tax (volume of business, Municipal Code Part VII chapter III) and construction excise, and no municipal income-tax power turned up (reichardescalera.com/wp-content/uploads/2021/10/August-20-2020-New-Municipal-Code-Replaces-Prior-Municipal-Legislation.pdf); the statute text still has to be fetched and quoted. Left: Guam, U.S. Virgin Islands, American Samoa, Northern Mariana Islands, then the six rows via scripts/research/build-starting-law.py and the law-wiring-taxes.test.ts redraw. Continue on branch claude/pool-research-local-income-tax-authority-dc-territories.

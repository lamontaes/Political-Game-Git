---
id: core-opening-coverage-every-locality
title: "Every locality whose government covers it twice opens without a coverage conflict"
area: core
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** core-opening-public-coverage-conflict-bayou-blue's fix landed on main with #5899 (4541542a17): a government's recorded county-buyer coverage of a place stands for every office it runs there, so Bayou Blue, Louisiana opens. Its last Done-when clause is still unmet: a test that builds the opening for every locality in the place records whose governments carry more than one coverage row for a place, naming any that fail. The regression test (src/core2/opening-customers-county-office.test.ts) covers Bayou Blue and one drawn place. This item is that exhaustive check.

**Rules.** One rule, all 56 places: the check enumerates the localities from the place records, never a named list, and names each failure with its place key; building an opening is slow, so it is a script under src/core2/tooling/ rather than a unit test, and it builds only the opening, not a played year.

**Done when.** A script lists every locality whose governments carry more than one coverage row for a place (from the government-unit and coverage records), builds each one's opening with buildBenchWorld, and exits nonzero naming each place key that throws; the PR gives the count of localities checked and the result on main; core-opening-public-coverage-conflict-bayou-blue is then done.

**Files.** src/core2/tooling/, src/core2/opening-customers.ts

**Notes.** TODO

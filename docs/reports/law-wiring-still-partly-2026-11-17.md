# Laws that are still only partly working (November 17, 2026)

What you can do now: in dev mode, enact any of the game's laws and open its bill card to see who it reached, the money that moved, and what repeal undoes. 153 of the table's 191 law rows now show all of that. Six rows joined them on November 17, 2026: free transit fares, the Medicare spending line, the earliest and full-retirement Social Security claim ages, the Social Security spending line, and the veterans' spending line. SSI, child care help and energy help are now paid on the day the treasury pays each month's bills. 38 rows still stop short, in five groups below. Nothing here needs a decision from you; it is a to-do list.

## Spending lines with no researched link to what they change (13 rows)

These lines move money and people today. What is missing is a researched link from the line to a result in a town.

- Federal transportation, health, education, community and regional development, agriculture, defense and international affairs. A raise to a federal grant line reaches states and towns only as extra aid money, so the receiver's own highway, school and hospital lines never rise. The fix is written up in `docs/pool/items/laws-federal-grant-line-raise-reaches-receivers-matching-line.md`; the budget work it waited on has now landed, so it can be built.
- Income security (SSI), child care's income limit, SSI's rate and energy help's income limit. The link from SSI to poverty is built in pull request 9877 (not yet in the shared build, so the table does not count it).
- The delayed Social Security credit age. No source says what a later cutoff changes, and your November 10, 2026 ruling (in `docs/coordination/OWNER-DECISIONS.md`) stops research that only adds precision.
- National data privacy. No researched link yet.

## Laws that nothing records who they bind (11 rows)

The law is passed and read, but no record names the people or groups it applies to, so nothing can be traced.

- Forgive student loans, pay for a higher debt limit, vouchers for every eligible family, states share disaster costs, federal campaign limits, congressional stock trading, statehood for D.C., admit more immigrants, raise tariffs, and limit power plant carbon (ten rows).
- Ban the box for public hiring at the state level (one row). Pull request 9963 adds a record of the public employers the law binds. It is not in the shared build yet, so the table still counts this row as partly.

## Rows with no starting value in some places (11 rows)

- Town-level fees for parks, sewer and trash, hospitals and schools (four rows, new in the table this time): the table names 12 places with no starting value, out of the 56 places, and then stops listing, so the full count is not known.
- Campaign contribution limits for governor, state senate, state house and local office (four rows): each names 12 of the 56 places with no starting value and then stops listing, so the full count is not known.
- Governor term limit (one row): D.C., one of the 56 places, has no starting value.
- The town-level rows for ban the box and for retail electric choice (two rows): each names 12 of the 56 places and then stops listing.

## Two rows only the legislature reads (2 rows)

- State retail electric choice, and meeting notice hours. The only reader is the lawmaking engine (`src/core2/modules/legislature.ts`). The law-wiring check does not accept lawmaking as a reader that puts a law's effect on people or money, so these rows stay partly.

## One row whose money nobody pays (1 row)

- Reducing federal mandatory minimums shortens sentences and lowers the federal prison count, but nothing pays the Bureau of Prisons, so the savings are not a dollar anywhere. The table marks this row as a placeholder for that reason (`docs/reports/law-wiring-matrix.json`, row `justice-rights.reduce-mandatory-minimums`).

## What I would do next

1. Build the federal grant line change: one change in the budget engine and three rows.
2. Add the SSI poverty link (9877) and the ban the box record (9963) to the shared build.
3. Give the ten other laws with no record of who they bind one, a law at a time.
4. The starting values for fees and contribution limits are research items: each needs a sourced value per place.

## How this was graded

Counts come from `docs/reports/law-wiring-matrix.json`: 191 rows, of which 153 are wired, 37 partly and 1 has a stopgap (a placeholder). The table counted 187 rows before today; the four it added are the town-level fee rows listed above, all partly. Nine rows this work touched were graded again on the November 17, 2026 build. Six moved. SSI, child care help and energy help did not move, because their research link is still missing at one drawn place, Brookhaven, West Virginia (place key 5410420). Every other row keeps its grade from its last run, between November 14, 2026 and November 17, 2026. Row grades and counts are measured by the law-wiring check. Each group's cause is read from the matrix's own reason for the row, so it is measured too. The plan for the federal grant lines and the claim about SSI are inferred from reading the code and the pull request.

A row is one law at one level, so a law can have more than one row.

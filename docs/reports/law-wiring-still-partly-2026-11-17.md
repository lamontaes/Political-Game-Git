# Laws that are still only partly working (Nov 17, 2026)

Of the game's 191 laws, 153 now show their whole effect in dev mode: who the law reached, the money that moved, what it changed for people and prices, and what repeal undoes. Today six more joined them: the Medicare line, both Social Security claim ages, the Social Security line and the veterans line. SSI, child care and energy help are now paid at the treasury's own monthly close. 38 laws still stop short, and the reasons fall into five groups below. One is waiting only on the next step in the budget work.

## Spending lines with no researched link to what they change (13)

These lines move money and people today. What is missing is a researched link from the line to a result in a town.

- Federal transportation, health, education, community and regional development, agriculture, defense and international affairs. A raise to a federal grant line reaches states and towns only as aid money, so the receiver's own highway, school and hospital lines never rise. The fix is written up and now unblocked: a pool item named `laws-federal-grant-line-raise-reaches-receivers-matching-line`.
- Income security (SSI), child care's income limit, SSI's rate and energy help's income limit. SSI's link to poverty is built and waiting to fold (pull request 9877).
- The delayed Social Security credit age: no source says what a later cutoff changes, and your Nov 10 ruling stops research that only adds precision.
- National data privacy: no researched link yet.

## Laws that nothing records who they bind (11)

The law is passed and read, but no record names the people or groups it applies to, so nothing can be traced.

- Forgive student loans, pay for a higher debt limit, vouchers for every eligible family, states share disaster costs, federal campaign limits, congressional stock trading, statehood for D.C., admit more immigrants, raise tariffs, and limit power plant carbon.
- Ban the box for public hiring is fixed in pull request 9963 and waits on its checks. It now records the public employers the law binds.

## Laws with no starting value in some places (11)

- Fees for parks, sewer and trash, hospitals and schools at the town level: most states have no starting row.
- Campaign contribution limits for governor, state senate, state house and local office: about a dozen states have no starting row.
- Governor term limit: D.C. has no starting row.
- Ban the box and retail electric choice as a state's grant of power to its towns: no state has a starting row.

## Two laws only the legislature reads (2)

- State retail electric choice and meeting notice hours. Nothing but the lawmaking engine reads them, which the check does not count as a reader.

## One law whose money nobody pays (1)

- Reducing federal mandatory minimums shortens sentences and lowers the federal prison count, but no engine pays the Bureau of Prisons, so the savings are not a dollar anywhere.

## What I would do next

1. Build the federal grant line pass-through: one change in the budget engine and three rows.
2. Fold the SSI poverty link (9877) and the ban the box record (9963).
3. Give the ten laws with no record of who they bind one, a law at a time.
4. The starting values for fees and contribution limits are research items: each needs a sourced value per place.

## How this was graded

The regrade ran on the Nov 17 train at one drawn place, Brookhaven, West Virginia (place key 5410420), for the nine rows today's work moved, and was merged with the earlier runs. Rows not re-run keep the grade from their last run, between Nov 14 and 17. The table read 147 of 187 before; it now reads 153 of 191.

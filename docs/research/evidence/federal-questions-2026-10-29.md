# Which federal questions can pass Congress and reach the town

This is research for `gov-congress-passes-policy-laws`, unit C2 of the world-governing plan. It covers 27 federal questions. For each one it records the law in force, the latest Senate floor vote, and what in the town reads the law. The full entries are in `data/research/campaigns/federal-questions-2026.json`. Nothing reads that file yet. Unit C3 wires the questions picked from it.

**Short answer.** Two questions can honestly get 60 Senate votes and have, or can cheaply get, a reader that reaches a named person in the town. The world's Congress can't file either one today. A third question gets 60 votes and already changes named workers' pay, but only through a budget line. It isn't a policy law.

## Ranked candidates

**1. Payroll tax terms, as a temporary cut when the economy is down** (`us-tax-terms:federal.payroll-tax-terms`)

- Roll calls: rate cuts got 60 votes three times, with both parties.
  - February 17, 2012: H.R. 3630 conference report, 60-36 (R 14-30, D 46-5, I 0-1).
  - December 17, 2011: S.Amdt. 1465 to H.R. 3630, 89-10 (R 39-7, D 50-2, I 0-1).
  - December 15, 2010: H.R. 4853, which set the 4.2 percent rate, 81-19 (R 37-5, D 44-13, I 0-1).
  - The CARES Act's employer deferral passed 96-0 on March 25, 2020. That was a deferral, not a rate cut.
- Reader: already built. Every paycheck reads the federal Social Security tax and records the named worker it reached (`tax-withholding.ts:167-208`, `budgets.ts:1739-1751`).
- What C3 must add:
  - A way for Congress to file a rate change. Today it files only policy questions (`world-legislating.ts:469-498`).
  - A stance that reads the national downturn record (`macro.ts`: the months table's unemployment and output gap). A played year without a downturn should pass no cut.
- Weak points: the votes are 14 to 16 years old, and the record supports only a temporary cut, never a raise.

**2. Federal excise terms, defined as extending the fuel tax before it lapses** (`us-tax-terms:federal.excise-tax-terms`)

- Roll calls: extensions got 60 votes twice.
  - August 10, 2021: the Infrastructure Investment and Jobs Act (H.R. 3684), 69-30 (R 19-30, D 48-0, I 2-0).
  - May 9, 2024: the FAA Reauthorization Act (H.R. 3935), 88-4 (R 44-0, D 42-4, I 2-0).
- Reader: none today, and a cheap one is possible. One federal fuel-excise rule in the price engine (`place-prices.ts:924-1091`) would charge every household for the fuel it buys.
- What C3 must add:
  - A US starting row of 18.4 cents a gallon that falls to 4.3 cents after September 30, 2028 (26 U.S.C. 4081(d)).
  - The `us-tax-terms:` prefix in C1's question list.
  - The reach recorded on the person who pays, because `reachedBy` drops household rows.
  - Proof against a twin world where the rate lapsed. An extension keeps the price the same, so the proof is the difference from the twin.
- Weak points: both 60-vote extensions rode inside larger authorization bills. A played year that opens October 12, 2026 ends about 11.5 months before the lapse. The 2021 extension passed the Senate about 13 months before its own lapse.

**3. Defense growth, only through the budget** (`us-federal-positions:defense.grow-defense-spending`)

- Roll calls:
  - December 15, 2025: cloture on S. 1071, the fiscal 2026 defense authorization, 76-20 (R 48-3, D 27-16, I 1-1).
  - October 9, 2025: S. 2296, 77-20.
  - The latest vote, cloture on the $1.15 trillion fiscal 2027 bill on July 14, 2026, failed 50-46 on party lines.
- Reader: the federal budget's defense line raises named workers' pay (`gov-measures.ts:387` to `jobs.ts` `payLevel`). It writes no reach row and works only in the town's own state.
- The catch: Congress already sets that line through its budget each year. A defense policy law would be a second writer of the same line. This counts only if the CTO accepts a budget line in place of a policy law.

## The rest

- **Get 60 votes, but no honest reader:**
  - Foreign aid: cloture 80-19 in April 2024, packaged with military aid.
  - Cutting mandatory minimums: cloture 82-12 in 2018. No engine sentences anyone federally.
  - Pairing a debt-limit rise with spending limits: 63-36 in 2023. Its reach stops at the Treasury.
- **The best readers, but no 60 votes:**
  - Raising the federal minimum wage: 47-52 on April 5, 2025, with one Republican yes.
  - The Medicaid and SNAP work requirements: already law by party-line reconciliation, 50-50 with the Vice President. Congress's only move is a repeal, and it needs its own consensus share of about one half. Otherwise members would repeal by a margin they never had.
- **Near misses:**
  - Targeted tariffs on buyers of Russian oil passed 86-11 on August 7, 2026. The tariff key models a general price rise and names nobody it reached.
  - The 2026 housing law passed 85-5, but it doesn't make vouchers an entitlement.

## Corrections to the plan

- The minimum wage's 42-58 vote in 2021 was a motion to waive the Budget Act, not cloture.
- The stock-trading ban did reach both floors in 2026. It passed the House 232-198 and failed Senate cloture 53-47. Data privacy never reached a floor.

## Sources

Senate counts come from Voteview's roll-call API, because senate.gov refused the fetches. House counts come from the House Clerk's roll-call files. Statute quotes come from Cornell's Legal Information Institute and govinfo. Every count above was refetched on October 29 and 30, 2026. Each entry's URL is in the data file.

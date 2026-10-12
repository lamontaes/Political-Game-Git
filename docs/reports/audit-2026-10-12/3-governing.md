# Audit 3: governing and laws in force, as code (Oct 12, 9:20 a.m.; read-only helper; opus-gov and opus-play)

All of M1-01, M1-07, M2-01 and M3-01..10 show `passes:false`.

- **The bench opens:** laws, offices, elections, campaigns, parties, voting, record, budgets, legislature, law-effects.
- **The bench does not open:** world-legislating, ballot measures, recalls, corruption.
- **`src/rules/legislatures` is unused by core2.**

## Works and reachable in /play

- **Laws in force:**
  - 12 numeric series plus property tax, across 317 jurisdictions;
  - 73 city and 15 county minimum-wage rows;
  - 35 future phases;
  - minimum-wage raises on their date.
  - **Display only:** benefits, sales tax and property tax (nobody gets SNAP, no sales tax is charged).
  - **Starting answers to policy questions aren't loaded as law.**
- **Offices and seats:** town seats go to residents; state and federal seats to fictional identities. The real-name check (7,988 hashed names) covers Congress, governors and legislators only; local names are never checked.
- **Budget priorities:** the council votes the **city** budget only; other levels carry forward.
- **Withholding:** income tax, Social Security and Medicare from each paycheck into treasuries. **But money never leaves a treasury.**

## Thin or broken

- **Bill writing:**
  - The catalog has no caller outside tests.
  - The bench offers the 10 law series plus 5 effect questions, with a raw number box.
  - **Bug: a council can enact SNAP, the Medicare tax, the Medicaid match or the property tax.**
  - The fiscal note prices the minimum wage only.
  - Bill numbers are generic YYYY-NNN.
- **Negotiating:**
  - Stakes show as exact numbers (mind-reading).
  - Every deal adds +0.5 whatever is offered; a "declined" deal still counts and costs nothing.
  - The bench has no amend option.
  - Deals aren't recorded or journaled.
  - No lies.
- **Legislature:**
  - Committees only for bodies over 9 members.
  - Witnesses only for minimum-wage bills, and nobody questions them.
  - **Ties fail:** no lot, no tie-breaker.
  - No rules votes.
  - **The player never casts their own vote.**
- **Council meeting scene: missing** (a silent vote two weeks later).
- **Executive:**
  - **The player can't sign or veto;** it's computed.
  - Every mayor gets a veto, whatever the form of government.
  - Appointments have no caller.
  - Orders and emergencies are missing.
- **Laws changing the world:**
  - Effects reach residents for only 5 questions; nothing acts on them (no enforcement).
  - No screen shows them.
  - Step 9 is counted on "enacted", even before the effective date.
  - No funded-work delivery and no outcome web.
- **City income tax collects $0** (a "percent" vs "percent-flat" unit bug).
- **Other governments:**
  - Tests only.
  - **Federal acts never take effect** (the same-day effective date is skipped), and the test doesn't assert it.
  - 0 of 17 ballot measures reach people.
- **Corruption:** tests only, not registered.
- **Staff, interest groups, constituent cases:** missing in core2.

## Breadth (counted)

- **Catalog:** 18 subjects, 133 topics, 74 policies (59 yes/no questions, 12 budget lines, 3 amounts). Immigration, defense and trade have 0. Federal: 2 draftable policies; county: none.
- **6 of 74 policies (8%) reach named people:**
  - 5 questions: handgun age, anti-discrimination, paid family leave, right to counsel in eviction, bottle deposit;
  - the minimum wage.
- **5 of 18 subjects have any effect on people.**
- **The law-effects test stops at the first question that passes:** a single proof path.

## Questions

1. When does the 18-subject bill paper reach /play?
2. What's the plan for the 68 policies that reach no one, and will the test run every policy?
3. Federal acts never firing, $0 city income tax, councils enacting SNAP: why didn't the tests catch them?
4. Why can't the player vote or sign or veto, and why does a declined favor still move a vote?

---
id: words-budget-line-amendment-named-as-the-years-budget
title: 'Every one-line budget amendment is called "Budget Ordinance", so a council seems to pass the year''s budget at meeting after meeting'
area: words
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: Playtester P1, Nov 13
claimed-at:
---

**What.** A new life on main 5e68cde1, playing week by week. In Curtisville, Pennsylvania (bench seed 24b09c77-0589-433f-9b6b-0c77e53b4ff7), Politics, Recent votes, shows the West Deer Township Board of Supervisors passing a "Budget Ordinance" on Mar 4 and another on Apr 1. The Journal says "My father voted for Ordinance 2025-6, the Budget Ordinance. I'll never forget that.", then the same for 2025-8 and 2025-14 within a month. In Hickory Hill, Kentucky (bench seed b258ee86-71f0-47cc-9311-fb3f905f521f), the city council passes a "Budget Ordinance" on Jul 1 and again on Aug 5. A player reads this as the year's budget passing again and again, and nothing says which spending line moved. Seen: Politics, Recent votes, and the Journal's lines on a relative's votes, naming a budget amendment by the line it changes.

**Cause.** Found in code: src/english/bill-names.ts, the budget branch near line 117. Any bill whose sections are all `budget-line` provisions with no operation takes `book.budget.name` ("Budget", data/english/bill-names.json `budget`) and the purpose "the government's spending for the year". The members' line amendments that src/core2/modules/world-legislating.ts `fileLines` files at each meeting (up to `localBudgetAmendmentsPerMeeting`) are one-line `budget-line` bills, so each one gets the year's budget's name.

**Fix.** Name a bill that changes one or a few spending lines by its lines and direction, and keep "Budget" for the year's budget the budget engine adopts (src/core2/modules/legislature.ts `budget` bills). The words for the new name and purpose ("Police Funding Increase Ordinance" or the like) come from the Words session as a new entry in data/english/bill-names.json; the code reads the line's name from the provision. Every screen that names bills (Politics, Bills, the Journal, News) then shows the new name, because they all read the one name.

**Time box.** 2 hours for one Sonnet session.

**Rules.** No hand-written player text: the name comes from the bank. Replace, never layer: the one name function changes, with no second naming path for amendments. One rule, all 56 places.

**Done when.** A second session, on main, plays a new life in a drawn place for three months with a parent or neighbor on the local body. Politics' Recent votes and the Journal name each budget amendment by the spending line it moves, and "Budget Ordinance" appears only for the year's budget.

**Waits on.** The Words session's name and purpose words for a line amendment.

**Files.** src/english/bill-names.ts, data/english/bill-names.json, src/core2/modules/world-legislating.ts

---
id: legislation-budget-line-bills-all-titled-budget-ordinance
title: "A member's bill to raise or cut one spending line is titled Budget Ordinance, so two on one agenda read the same"
area: words
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: carry-budget-title
pr: #9333
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: "The Account lead's list of faults found in play, Nov 14, 2026 (the meetings floor check at Klamath Falls, Oregon)"
checked:
claimed-at:
---

**What.** At Klamath Falls, Oregon (4139700, draw meet-a1:2 "meetings-floor") the board and the council each put several bills on the floor that change one spending line (welfare, natural resources, police, local aid), and every one reads "the Budget Ordinance" (Ordinance 2025-1, 2025-3 and 2025-4 at the board; 2025-5 and 2025-6 at the council). On a meeting's agenda two bills with the same title cannot be told apart. Seen: the meeting screen, the news and a floor-debate scene naming the bill.

**Cause.** Found in code: `billNameOf` in src/english/bill-names.ts treats any bill whose sections are all budget-line sections with no operation as the annual budget and titles it "Budget Ordinance". A member's one-line change (src/core2/modules/world-legislating.ts, `kind: "budget-line"` with the line's delta) carries a value and no operation, so it falls into that branch, although data/english/bill-names.json holds an authored name for twelve lines ("Police Funding Increase", "Parks Funding Reduction").

**Fix.** A bill with exactly one budget-line section and a nonzero value is named for its line through the same authored table (`billNameFor("budget:<line>", form, value < 0)`); a government's annual budget bill (its record carries `budgetFor`), a line with no authored name, a request carried at 0, and a bill with several lines stay "Budget Ordinance". `billTitleOf` keys such a section by `budget:<line>`.

**Time box.** 2 hours.

**Rules.** No hand-written player text in code: the names are the authored bank rows. One rule, all 56 places. Replace, never layer.

**Done when.** A second session plays Klamath Falls (draw meet-a1:2) five months and the board's one-line bills read as "Public Assistance Funding Reduction Ordinance", "Natural Resources Funding Reduction Ordinance" and the like, never twice the same for different lines; a full budget still reads "Budget Ordinance"; and the same on one other drawn place.

**Waits on.** Nothing.

**Files.** src/english/bill-names.ts, src/english/bill-names.test.ts, src/director/budget-bill-titles.test.ts (new)

**Notes.** Two one-line bills for the same line in the same direction still share a title (their numbers differ).

---
id: gov-treasury-opens-with-no-closed-months
title: "No body can amend its budget for up to a year after opening, because the treasury opens with no closed months"
area: laws
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
root: none
lead: laws-effects
model: opus
effort: medium
source: views thread, Nov 16 (bill-page-view budget case), lead's call
---

**What.** A body may amend its adopted budget only by the room the treasury's own months give it, and the treasury opens with no closed months, so no council, county board, legislature or Congress has a budget amendment on its agenda for most of the first year. At Battle Mountain, Nevada the first budget-line bill came on day 140, and the state and county rooms opened only after the July fiscal year began. This runs against the owner's Nov 14 rule that the town must be in motion on day one.
Seen: the player opens any body's agenda in the first months and finds no budget amendment on it.

**Cause.** Measured: at Battle Mountain, Nevada (3204900), seed pin-bill-page-view:budget:0, by a probe that calls `amendmentRoom` every 10 days for 240 days on the Train at 544056f5. The treasury months for US, US-NV and county:32015 were 0 at opening. Every room was null until 2025-07-09 (US-NV and the county; US still null on 2025-09-17), and the first budget-line bill was filed by a district board on day 140. Found in code: src/core2/modules/budgets.ts `amendmentRoom` returns null unless the treasury holds months both since the budget began and in the twelve before it. `treasuryMonthsOf` (src/core2/budgets-treasury.ts) is filled only by months closed in play, and day-zero.json marks core2-budgets-v1.treasuryMonths as flow-only, "filled by day 31".

**Fix.** The treasury opens with the closed months of the fiscal year already under way, and the twelve months before it, built from the same records the opening uses for the adopted budget and year-to-date: the budget's revenue lines spread over the months by the treasury's own monthly rule. No hand-filled list and no second engine. Then mark the table as a stock in day-zero.json, with the town, state and federal answer.

**Time box.** 4 hours, Opus at medium effort.

**Rules.** Wire to the world: the opening months come from the budget and opening records the game already keeps, so `amendmentRoom` reads a real pace on day one, and the day-zero test checks it at both of its pinned places.

**Done when.** In a drawn place, Some Town, State (seed nobody chose), a body files a budget amendment with a cause in the first two months of play, and a second session opens that body's agenda in the running game on day 30 and sees it, with dev mode's Trace showing the room's arithmetic.

**Waits on.** Nothing.

**Files.** src/core2/budgets-treasury.ts, src/core2/modules/budgets.ts, src/core2/data/opening/day-zero.json, src/core2/day-zero.test.ts

**Notes.**

---
id: play-budgets-every-government-political-process-style
title: "Budgets lists every government the world keeps, reads like The Political Process's budget screens, and dates a budget by its period"
area: play
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: owner playtest of v0.73.0, Nov 1, 22:40 UTC (second batch)
lead: play-first
milestone: play-first
after:
model: sonnet
effort: medium
root: design-country-tier
---

**What.** Owner, Nov 1 playtest of v0.73.0, on Politics, Budgets, in a U.S. Virgin Islands game: it showed only the U.S. and the Virgin Islands, the owner did not know why it did not show every state, and he asked for the budget's enforced dates ("October 1st, 2024 to blank") in place of the 'in force at the opening' line, in the style of The Political Process. The look has since been rebuilt to the approved mock (play-menus-budgets-to-mock, 'Mix: strips'). What remains is that the picker lists only governments whose budget the engine already keeps, and the fiscal year shows as a bare number instead of the budget's period in words. List every state and territory budget the budgets engine keeps, plus the player's county and town, and show each budget's start and end dates.

**Cause.** Found in code: `budgets()` in src/bench/play.mjs (line 3549) builds a tab only for governments with a `latest` budget and writes the fiscal year as the bare number (`fiscal: ... latest.fiscalYear`, about line 3680), though the budget record already holds `startsOn` and `adoptedOn` (src/core2/modules/budgets.ts, lines 168 and 169); `budgetView` in src/bench/budget.ts (line 232) lists only what `governments(api)` (src/core2/modules/budgets.ts, line 2270) holds. Design: owner, Nov 1 playtest and docs/mocks/2026-11-07-approved/RULINGS-nov5.md (items 19, 38, 56, 59).

**Fix.** Show the budget's start and end dates in words on Budgets (from `startsOn` and the next year's start), confirm the 'in force at the opening' line is gone, and list every state and territory budget the engine keeps. States the engine does not yet keep get their budgets with the country tier, so that part waits on core-country-tier-ledgers-replace-outside-budgets; the dates part waits on nothing.

**Time box.** 4 hours for one Sonnet session; if not done, push what exists, open the draft PR, write the handoff.

**Rules.** This is a game, not a spreadsheet: the owner named The Political Process as the model for this screen. An effect is a read, not a record: the screen reads the budgets engine's records for each government and computes nothing of its own. No hand-written player text: the period reads as 'October 1, 2024 to September 30, 2025' through the English engine.

**Done when.** A second session, in a drawn place (named with its seed), opens Politics, Budgets: the picker lists the nation, every state and territory whose budget the engine keeps (the count equals the budgets table's governments in a test), the player's county and town; the period line reads the budget's start and end in words; no 'in force at the opening' text shows; the books panel's figures come from the journal for that government with record ids named; screenshots at 1440x900 for the nation, a state and the town.

**Waits on.** core-country-tier-ledgers-replace-outside-budgets, for states beyond the player's own; the dates part waits on nothing.

**Files.** src/bench/play.mjs, src/bench/budget.ts, src/bench/budgets.browser.mjs, src/bench/play.css

**You will see.** Budgets lets you pick any state, your county or your town, shows the budget's dates, and looks more like The Political Process.

**Screenshot.** Budgets for the nation, a state and the player's town, before and after.

**Notes.** Filed by the CTO from the owner's v0.73.0 playtest, second batch (Nov 1, 22:40 UTC, five screenshots, a game in the U.S. Virgin Islands). Read: OWNER-DECISIONS (Oct 29 menus redesigned the way Government was; Oct 29 Political Process baseline; one history), the pool for twins.

Owner's answer, Nov 1 23:30: "So the lane will show me a mock and you'll send it to me in this chat." MOCK FIRST: the lane sends the mock image (from The Political Process references) to the CTO, who sends it to the owner; build after his answer.

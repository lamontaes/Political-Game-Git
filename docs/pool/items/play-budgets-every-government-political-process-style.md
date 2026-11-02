---
id: play-budgets-every-government-political-process-style
title: "Budgets lists every government the world keeps, reads like The Political Process's budget screens, and dates a budget by its period"
area: play
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: owner playtest of v0.73.0, Nov 1, 22:40 UTC (second batch)
lead: play-first
milestone: play-first
---

**What.** Owner, Nov 1 playtest of v0.73.0, on Politics, Budgets, in a U.S. Virgin Islands game: "It only shows the U.S. and the Virgin Islands. I don't know why it doesn't show every state either. And this is a good start to displaying the information. I would like you to look at another political game, the political process, look how it displays budgets and stuff like that, and use that as inspiration... If you look on the budget enforce at the opening, remove that. I don't like that. And maybe put like when it is enforced, so October 1st, 2024 to blank." The books panel also shows the federal government taking in $111,000 since January 20. Study how The Political Process lays out budgets and spending (its public screenshots and docs/roadmap/political-process-baseline.md), draw a mock in that spirit from our shared parts, and list every state and territory budget the budgets engine keeps, plus the player's county and town.

**Rules.** This is a game, not a spreadsheet: the owner named The Political Process as the model for this screen. An effect is a read, not a record: the screen reads the budgets engine's records for each government and computes nothing of its own. No hand-written player text: the period reads as "October 1, 2024 to September 30, 2025" through the English engine, and "in force at the opening" goes.

**Done when.** In a drawn place (named with seed), the government picker lists the nation, every state and territory, the player's county and town; the period line shows the budget's start and end dates; the books panel's figures come from the journal for that government with their record ids named in the PR; the PR shows the TPP references and the mock beside screenshots at 1440x900. The build follows the mock the owner approved through the CTO.

**Time box.** 4 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** Budgets lets you pick any state, your county or your town, shows the budget's dates, and looks more like The Political Process.

**Screenshot.** Budgets for the nation, a state and the player's town, before and after.

**Files.** src/bench/play.mjs, src/bench/budgets.browser.mjs, src/bench/play.css

**Notes.** Filed by the CTO from the owner's v0.73.0 playtest, second batch (Nov 1, 22:40 UTC, five screenshots, a game in the U.S. Virgin Islands). Read: OWNER-DECISIONS (Oct 29 menus redesigned the way Government was; Oct 29 Political Process baseline; one history), the pool for twins.

Owner's answer, Nov 1 23:30: "So the lane will show me a mock and you'll send it to me in this chat." MOCK FIRST: the lane sends the mock image (from The Political Process references) to the CTO, who sends it to the owner; build after his answer.

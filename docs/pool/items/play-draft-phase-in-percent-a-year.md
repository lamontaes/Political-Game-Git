---
id: play-draft-phase-in-percent-a-year
title: "The draft card lets you phase in a raise by a percent a year"
area: play
kind: feature
priority: 2
size: S
status: in-pr
pr: #9344
standard: 2
claimed-by:
blocked-on:
source: "Account lead cluster 11, Nov 14 (the screen half of the percent-a-year form; the owner's ruling Sept 12, travel clarification, item 1: bills phase in by dated steps or a percent a year)"
lead: governing
after: play-draft-phase-in-steps
model: sonnet
effort: medium
root: rc7-player-cannot-drive
---

**What.** A seated member can draft a raise as a percent a year: the card asks for the percent, the number of years and the first date, and the bill carries one dated section a year, each the amount before it raised by the percent. The engine and the route already take it; the card does not offer it, so a player cannot reach it. The bill the card produces is the same one the steps form makes, so the law in force follows each year's date. Seen: on the draft card of a member of a body that may set a wage floor, below the add-a-step row.

**Cause.** Found in code: `seatAct` in src/bench/legislature.ts takes `risePerYear: {percent, years, firstDate}` and turns it into the same dated sections as `steps`; the route in src/bench/handler.ts reads `risePercent`, `riseYears` and `riseFirstDate`; `onDraft` in src/bench/play.mjs (line 3616) and the card in src/bench/ui/draft-card.mjs send and show only the steps form.

**Fix.** On the draft card, beside "add a step" (`seat.addStep`), add a "rise by a percent a year" row with a percent, a number of years and a first date; `onDraft` sends the three values instead of `steps`; the card shows the sections the bill will carry, each year's amount and date, from the engine's own refusal text when a value is bad (a percent of zero, fewer than two years, a first date not after today). Use the controls and labels the card already shares; no new renderer.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No dice: the percent and years are the player's. Words for the card's labels come from the English engine's screen words, never typed in the screen. One screen renderer per menu type: extend the draft card, never a second one.

**Done when.** A second session, in a played world in a drawn place from all 56 with a seed the builder did not choose, as a member of a body that may set a wage floor, drafts a minimum wage by a percent a year on the card, and the bill on paper shows one section a year with the amount raised by that percent each year (bill record id named).

**Waits on.** play-draft-phase-in-steps (#8457) for the card's step rows; it is in the train.

**Files.** src/bench/play.mjs, src/bench/ui/draft-card.mjs, src/bench/handler.ts, src/bench/legislature.ts

**Notes.** Engine half built in the cluster 11 PR (#9309).

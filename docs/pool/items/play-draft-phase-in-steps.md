---
id: play-draft-phase-in-steps
title: "The draft card lets you phase in a raise: an amount and a date for each step"
area: play
kind: feature
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on: gov-m3-01-phase-in-by-dated-steps
source: "governing lead and the lane, Oct 30 (the screen half of gov-m3-01-phase-in-by-dated-steps)"
lead: play-first
milestone: play-first
---

**What.** Phase B unit 3 lets a seated member draft a raise in dated steps: `seatAct` takes `steps: [{ value, effectiveDate }]` for a law amount, and each step is a dated section of the one bill, whose law in force follows each date. The play screen cannot reach it yet, because the server route and the draft card pass a single amount. The route needs a `steps` parameter (src/bench/handler.ts about 921-933), `onDraft` in src/bench/play.mjs builds the act's parameters, and the draft card (src/bench/ui/draft-card.mjs) needs an amount and a date for each step. The lane builds it after #6913 moves the draft card onto its own plate.

**Rules.** Screens follow the mocks and the shared controls (`screen-to-mock`): the step rows use the card's existing controls and keep its `.draft-*` selectors, which src/bench/bill-screens.browser.mjs reads. No hand-written player text: the labels come from the English engine's banks. One engine: the screen passes the steps to `seatAct`, which refuses what the engine refuses (a budget line or a policy question, a date not after today or after the step before), and the card shows that reason worded.

**Done when.** In a drawn place (name and seed printed), the draft card for a minimum-wage bill offers a second step with its own amount and date. Drafting two steps files one bill whose paper shows both sections with their dates, by bill id, and src/bench/bill-screens.browser.mjs still passes.

**Time box.** 3 hours.

**You will see.** On a bill's draft card, an "add a step" row: raise the wage to one amount on one date and to another later.

**Screenshot.** The draft card with two steps filled in, and the bill paper with both dated sections.

**Files.** src/bench/handler.ts, src/bench/play.mjs, src/bench/ui/draft-card.mjs, src/bench/bill-screens.browser.mjs

**Notes.** Filed by the governing lead at the lane's request (Oct 30). The engine half is branch governing/phase-in-dated-steps.

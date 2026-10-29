---
id: play-first-petition-count-on-screen
title: "The filing shows the petition's signatures held, the count the clerk asks and the deadline"
area: play
kind: feature
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Filing is a petition now (owner, Oct 28; PR claude/elections-petition-filing): the petition record holds the signatures needed, each signer and the deadline, and the clerk checks it the morning after. The screen shows only the status label (Your petition is out for signatures). The player cannot see how many have signed, how many the clerk will count or how long is left, so the canvass has no visible goal. The record is petitionOf(api, filingId) in src/core2/modules/elections.ts: needed, signers, due, and check once the clerk has counted.

**Rules.** No hand-written player text: the words come from the English banks and the control names (player-screen-text: rounded counts, worded dates, no ids). A read-only screen spends no time and creates no facts. One rule, all 56 places.

**Done when.** In a drawn place whose law asks signatures, a new life files at the counter, canvasses once, and a browser check shows the filing's signatures held rise from zero with the count asked and the deadline worded; after the clerk's check the screen says on the ballot or came up short; place and seed named in the PR body.

**Files.** src/bench/calendar.ts, src/bench/government.ts, src/bench/data/controls.json, src/bench/play.mjs

**Notes.** TODO

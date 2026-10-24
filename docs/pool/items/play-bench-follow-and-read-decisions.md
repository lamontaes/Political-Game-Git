---
id: play-bench-follow-and-read-decisions
title: "In the bench, follow two residents and read why each made the same choice differently"
area: play
kind: feature
priority: 2
size: M
status: claimed
claimed-by: claude/play-bench-follow-decisions
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T03:31:11.460Z
---

**What.** The traits lead's order says the owner plays the personality work by opening two neighbors in the bench, one bold and one cautious, and reading why each took or turned down the same loan, job or cause. Today nothing in the bench puts a resident in focus, so their acts keep no reasons, and a person's dev why panel (src/bench/dev-why.ts, ledgerPanels) shows only the year's money ledger. Add a dev-mode control to follow a resident (they join the people the player deals with, core.focusPersonIds, so each act keeps its reasons as it does for the player's circle), and a second why panel for a person listing their kept decisions: the date, the options offered, the one picked, and each option's recorded reasons with the trait reason shown, each row naming its act record id.

**Rules.** No hand-written player text: the panel shows record data and control names only, in dev mode. Ask why: every row names the act record it reads. An effect is a read: following changes only which reasons are kept (why-kept), never what anyone decides.

**Done when.** In the bench on a drawn place, seed named, following two residents and playing a month lists each one's decisions with their trait reasons by act record id, src/bench/dev-why.test.ts covers the new panel, and a browser check (browser-visual-acceptance) takes a screenshot of the two panels side by side.

**Files.** src/bench/dev-why.ts, src/bench/dev-mode.ts, src/bench/dev-api.ts

**Notes.** Filed Oct 24 by the traits lead: the order's 'How the owner will play it' needs it; the played-year pair test (traits-end-to-end-pair) shows the records exist once a resident is in focus.

---
id: world-jobs-offer-deadline-held
title: "A job offer's deadline holds the player's clock until the offer is answered, now that the play screen has accept and decline"
area: world
kind: stopgap
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** SG-WORLD-jobs-offer-deadline-reminder (src/core2/modules/jobs.ts) says a job offer's deadline stops the player's clock once as a reminder, not held, because the play screen had no control to answer an offer. It does now: src/bench/play.mjs shows each offer with Accept and Decline (POST /api/jobs/answer). Make the deadline stop a held stop (hold: true), so the clock cannot pass an unanswered offer's deadline, answering or the employer's lapse releases it (settleOffer already releases the tokens), and resolve the row.

**Rules.** Replace, never layer: the reminder stop and the stopgap marker are deleted, and the row is resolved with how. An effect is a read: the held stop is read by the player clock. No dice.

**Done when.** In a played world (buildBenchWorld, a drawn place from all 56, seed named in the PR body) a player-controlled job offer's deadline holds the clock: an advance past the deadline stops there, resuming without answering leaves it stopped, answering releases it, and a test in src/core2/jobs.test.ts covers it by offer record id; SG-WORLD-jobs-offer-deadline-reminder is resolved in stopgaps.json.

**Files.** src/core2/modules/jobs.ts, src/core2/data/stopgaps.json, src/core2/jobs.test.ts

**Notes.** One of the six rows of world-stopgap-jobs-faked-mechanic, split out because its stated blocker is gone. Found Oct 20 (claude/political-game-pool-yucp92-an).

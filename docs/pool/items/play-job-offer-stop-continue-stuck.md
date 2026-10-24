---
id: play-job-offer-stop-continue-stuck
title: "A pending job offer holds the clock: Continue on its stop resumes the same pause and time never moves"
area: play
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Seen Oct 24 by the traits lead's bench helper in Dandan, Northern Mariana Islands (seed 46b98144-23a8-42bd-b941-1954baea3bd8). When a job offer reaches the player, play raises the held stop and the page offers Continue. Continue posts /api/resume with kind stop and the same pause id (src/bench/play.mjs:914, handled in src/bench/handler.ts:1144), the stop comes back unchanged, and the clock does not advance until the offer is declined in the Jobs sheet. The player is stuck without knowing the offer is what holds them.

**Rules.** No hand-written player text: what the stop shows comes from the record and control names. Read-only screens spend no game time and create no facts. The engine offers, the player decides: Continue must either answer the offer as the character would or name the offer as what the stop is waiting for.

**Done when.** In the bench on a drawn place, seed named, a job offer to the player raises its stop and pressing Continue either moves the clock on (the offer answered by the character, by record id) or shows the offer as what the stop waits for, checked by a browser check with a screenshot.

**Files.** src/bench/play.mjs, src/bench/handler.ts

**Notes.** Filed Oct 24 by the traits lead from the play-bench-follow-and-read-decisions browser run, which declines the offer to keep time moving (src/bench/dev-follow.browser.mjs).

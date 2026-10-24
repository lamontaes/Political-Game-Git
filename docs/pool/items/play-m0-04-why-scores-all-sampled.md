---
id: play-m0-04-why-scores-all-sampled
title: "M0-04: half the sampled items open a why with no saved scores, and the check allows it"
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

**What.** Roadmap M0-04 says 20 randomly sampled items on screen each open a why with scores and record ids that exist in the core. In Plainview, Arkansas (place key 0555970, seed f2f00caaa5604688361010393a2f269a05c80306a5a61bf875be6c71d0047daa) its command (src/bench/m0-check.ts M0-04) passed with 20 of 30 items opening a saved explanation and only 10 carrying scores; the rest (household, job and similar records with no decision behind them) say none were saved. m0-check.ts (around 279-287) accepts no-saved-reason and never requires scoresStatus saved. A merger kept the flag false on #5869 for this.

**Rules.** No hand-written player text: a why shows the decision record's own saved reasons and scores, so items without a decision must either name the decision that made them or be left out of what the spec samples, by a rule stated in the PR.

**Done when.** src/bench/m0-check.ts M0-04 samples 20 items on screen and requires each to open a why with saved scores and record ids that exist, in the runner's drawn place and two more drawn places named with seeds; it fails when one sampled item has no scores; M0-04 reads passes: true with a bench screenshot of a scored why.

**Files.** src/bench/m0-check.ts, src/bench/dev-why.ts

**Notes.** TODO

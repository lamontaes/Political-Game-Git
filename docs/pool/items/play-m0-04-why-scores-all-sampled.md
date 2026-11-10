---
id: play-m0-04-why-scores-all-sampled
title: "M0-04: half the sampled items open a why with no saved scores, and the check allows it"
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
lead: play-first
model: sonnet
effort: medium
root: rc2-done-from-records
---

**What.** Roadmap M0-04 says 20 randomly sampled items on screen each open a why with scores and record ids that exist in the core. In Plainview, Arkansas (place key 0555970, seed f2f00caaa5604688361010393a2f269a05c80306a5a61bf875be6c71d0047daa) its command (src/bench/m0-check.ts M0-04) passed with 20 of 30 items opening a saved explanation and only 10 carrying scores; the rest (household, job and similar records with no decision behind them) say none were saved. The check accepts that answer and never requires saved scores, so half the sample proves nothing about why. A merger kept the feature flag false on a pull request for this reason.

**Cause.** Found in code: the M0-04 step in src/bench/m0-check.ts (lines 279 to 292) samples saved ids, accepts trace status 'no-saved-reason' and counts `scoresStatus === "saved"` without requiring it. Measured in Plainview, Arkansas (0555970, seed f2f00caaa5604688361010393a2f269a05c80306a5a61bf875be6c71d0047daa): 20 of 30 opened a reason, 10 had scores.

**Fix.** Sample only items that come from a decision record (or have each item name the decision that made it) and require saved scores and existing record ids for every sampled item; state the sampling rule in the PR body.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No hand-written player text: a why shows the decision record's own saved reasons and scores, so items without a decision must either name the decision that made them or be left out of what the spec samples, by a rule stated in the PR. Ask why: every sampled item opens its reasons by record id.

**Done when.** A second session runs M0-04 in src/bench/m0-check.ts in the runner's drawn place and two more drawn places named with seeds, and sees it sample 20 items on screen that each open a why with saved scores and record ids that exist; the step fails when one sampled item has no scores; M0-04 reads passes: true with a bench screenshot of a scored why.

**Waits on.** Nothing.

**Files.** src/bench/m0-check.ts, src/bench/dev-why.ts

**Notes.** TODO

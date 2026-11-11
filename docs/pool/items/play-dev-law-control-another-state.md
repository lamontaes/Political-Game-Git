---
id: play-dev-law-control-another-state
title: "Dev mode's law control cannot set another state's law"
area: play
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/pool-play-dev-law-control-another-state
pr: #8614
after:
blocked-on:
lead: play-first
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
claimed-at: 2026-11-11T05:13:57.701Z
---

**What.** Dev mode's law control sets a law only at the levels of the player's own chain: setLaw (src/bench/dev-mode.ts line 559) finds its level in lawChain(api).levels and throws for any other. Items whose Done when has a second session change another state's law and watch that state answer cannot be checked in the game. The first is core-country-tier-ledgers-replace-outside-budgets: raise another state's sales tax two points and read that state's next budget against the same world left alone (PR #8329). Seen: in dev mode's law control, a second session picks another state, sets its sales tax two points higher, and reads that state's new rate in the Watch or Trace panel.

**Cause.** Found in code: src/bench/dev-mode.ts setLaw (line 559) reads level.jurisdiction from lawChain(api).levels only; another state's law rows are kept under its state key (src/core2/modules/laws.ts stateLawInForce, line 639, reads rows whose jurisdiction is the state key).

**Fix.** Give setLaw an optional stateKey: with one, enact the row at level state under that state key (as src/core2/outside-budgets.test.ts does) and refuse the town's own state, which keeps its chain path. Add the choice of state to the law control in the dev panel and to the dev-api route that calls setLaw, and a test in src/bench/dev-mode.test.ts that a law set for another state is what stateLawInForce reads there.

**Time box.** 3 hours

**Rules.** One rule, all 56 places: the state is chosen from the 56, never named in logic. Replace, never layer: the one setLaw takes the state; no second law control.

**Done when.** A second session opens dev mode in a drawn place (place and seed written down), sets another state's sales tax two points higher with the law control, and sees stateLawInForce for that state read the new rate in the Watch or Trace panel, by the law row's record id.

**Waits on.** Nothing.

**Files.** src/bench/dev-mode.ts, src/bench/dev-api.ts, src/bench/dev-mode.test.ts

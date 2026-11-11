---
id: world-household-split-keeps-home
title: "When part of a mortgaged household leaves, a recorded decision says who keeps the home and the loan"
area: world
kind: stopgap
priority: 3
size: M
status: dropped
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: lives
model: sonnet
effort: medium
root: design-life-record
source: added with npm run pool -- add
checked: fable 2026-11-10
claimed-at:
branch: claude/pool-world-household-split-keeps-home
---

**What.** src/core2/modules/moves.ts never lets a mortgaged household split except for a grown child moving out; a household that leaves sells its home. Add a recorded decision of who keeps the home and its mortgage when some members leave (who holds the title and loan, who can afford the payment), so groups can leave with part of the household behind. This closes SG-P15-moves-owners-stay. The owner's Oct 20 ruling keeps the player's own family from leaving the player before 1.0.

**Cause.** Found in code: `decide` in src/core2/modules/moves.ts (line 1323) returns null at the check near line 1372 and registers the stopgap SG-P15-moves-owners-stay (src/core2/data/stopgaps/p15.json) when a mortgaged household would split.

**Fix.** Record who keeps the home and its mortgage when members leave (title, income, payment) and change the mortgage payer on the credit engine; the player's household never splits; mark SG-P15-moves-owners-stay resolved.

**Time box.** 6 hours for one session of the Sonnet model. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: who keeps the home reads title, income and the payment. One model, two tiers: counted households split by the same rule. Wire to the world: the mortgage's payer changes on the credit engine.

**Done when.** A second session (not the builder) plays a one-year world (`buildBenchWorld`, drawn place and seed named) and sees a mortgaged household split with the stayers keeping the loan, the mortgage payer change and the leavers' move named by record id, checked in src/core2/moves.test.ts; the player's household never splits.

**Waits on.** Nothing.

**Files.** src/core2/modules/moves.ts, src/core2/modules/credit.ts, src/core2/moves.test.ts, src/core2/data/stopgaps/p15.json

**Notes.** Oct 20 (pool feeder): the row SG-P15-moves-owners-stay stays open while its pool item is done.

Released (2026-11-11): 6-hour change: a recorded who-keeps-the-home decision in moves.ts plus changing the mortgage payer on the credit engine and counted households; moves.ts decide() line 1323 returns null for a mortgaged split; not started. Continue on branch claude/pool-world-household-split-keeps-home.

Released (2026-11-11): second read: leave() in moves.ts already keeps the home when stayers remain; the missing piece is a core API to change a standing mortgage contract's payerIds (none exists in finance/credit: grep for set/replace payer finds nothing) plus the who-keeps-it decision and counted households; needs the credit/finance owner to add the API first. Continue on branch claude/pool-world-household-split-keeps-home.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have recorded who keeps the mortgaged home when members leave; the player's own family is ruled to stay and nobody else's split is shown.

---
id: world-business-owner-seam
title: "Finish #4338: business owners' decisions with the core-to-module seam inverted"
area: world
kind: wiring
priority: 1
status: done
claimed-by: claude/world-business-owner-seam
pr: #4488
blocked-on:
milestone:
source: "reissue item 7; PR #4338 branch pool/business-owner-decisions"
claimed-at: 2026-10-15T22:29:09.721Z
---

**What.** The business owners' decisions pull request makes the core (src/core2/choice.ts) import a module (modules/residents), which inverts the layering. The residents module should register a callback, or the chooser should read api.accounts, so a counted owner's fund is reached without the core depending on a module. Main must be merged keeping the savings withdrawal in closeByChoice and then the counted-owner fund, in that order. A player sees a business owner's own money decide whether the shop closes.

**Rules.** Replace, never layer: the core-to-module import is deleted, not left beside a callback. One model, two tiers: a counted owner decides with the same rule as a full owner through the shared chooser. Wire to the world: the owner's draw moves a real dollar through the ledger. Ask why: the decision cites its recorded reasons.

**Done when.** The branch merged with main (plain merge, never force) and no import of a module remains in src/core2/choice.ts, checked by a grep in the PR body. In a one-year played world (buildBenchWorld, a drawn place from all 56, seed named) a counted owner's business decision record id cites their fund's account record id. The tests in src/core2/business.test.ts and src/core2/closure-by-choice.test.ts pass. The owner plays it: watch a shop owner close or keep a failing shop and read why.

**Files.** src/core2/choice.ts, src/core2/modules/residents.ts, src/core2/modules/business.ts, src/core2/business.test.ts, src/core2/data/stopgaps.json

**Notes.** None.
Sent back 2026-10-15 from PR #4338 (branch pool/business-owner-decisions): code conflict with main in src/core2/modules/business.ts, src/core2/business.test.ts, stopgaps.json; finish on that branch, merge main into it first. (PR references as of 2026-10-15.)

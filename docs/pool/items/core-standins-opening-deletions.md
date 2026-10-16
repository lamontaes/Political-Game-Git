---
id: core-standins-opening-deletions
title: "Delete the made-up shared past, falling-outs, favors and visitor family from the opening (from #4151)"
area: core
kind: stopgap
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "split from core-people-standins-oct14"
---

**What.** The #4151 audit deleted the opening's invented history: the shared-past, falling-out and favor generators and their data and parameters, the synthetic visitor family (with its builder, geography search and four parameters), and the stand-in owner payouts, so nobody has a made-up past before the player meets them. On main some of those files were changed since (opening-falling-outs.ts, opening-favors.ts); redo the deletions against main's versions.

**Rules.** No hand-written player text; replace, never layer (the stand-in and its registry row go in the same change); a row is closed only by the replacement, never by deleting the row without it; one rule, all 56 places; no dice.

**Done when.** In a one-year played world (`buildBenchWorld`) in a drawn place, no person has a falling-out or favor record from before day one that nothing in the deep past wrote, the visitor family is gone, and the opening, deep-past and finance tests pass without the deleted generators. Registry rows SG-P8-shared-past-history, SG-P15-falling-outs, SG-P15-favors and SG-P8-opening-customer-outside-households are resolved.

**Files.** src/core2/opening-falling-outs.ts, src/core2/opening-favors.ts, src/core2/deep-past.ts, src/core2/opening-customers.ts, src/core2/data/stopgaps.json

**Notes.** Check docs/coordination/DECISION-REGISTER.md first: the owner ruled that nobody has a full past until filled in (AGENTS.md, keep it simple). Split from core-people-standins-oct14 (Oct 16): PR #4151 (branch stopgaps/people-core) now conflicts with main in about 40 files and was not merged; its table of rows is in that PR's description.

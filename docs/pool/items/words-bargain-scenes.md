---
id: words-bargain-scenes
title: "A vote trade is a vote ask for the holdout and a section bargain for the sponsor, from the legislature's record"
area: words
kind: feature
priority: 1
size: S
status: open
claimed-by:
pr: #5949
blocked-on:
after: words-scenes-fire-in-play
source: added with npm run pool -- add
claimed-at: 
---

**What.** The owner, Oct 24: passing along his bargaining votes and comments, make it happen, at least behind the scenes; the code is already there. The legislature already records a vote trade (bill-amendment, kind trade-amendment) when a sponsor gives a holdout a section for their vote, but the director sized no moment from it and the vote-asked and section-bargain scene types waited on producers that never came. This item sizes the record, fires both scenes from it with the right cast, stages them in the chamber the record names and gives their talk the bill and section.

**Rules.** Wire to the world: the scenes fire from the legislature's own trade record, read by the director, with no invented ask. Ask why: each scene names its cause record, and its bill and section come from that record.

**Done when.** src/director/bargain-scenes.test.ts in the played world (buildBenchWorld), on places drawn from all 56 with a seed nobody chose, finds a vote trade and shows the holdout's vote-asked scene with the sponsor as colleague and the sponsor's section-bargain scene with the holdout, both in the record's chamber, composed with the trade's bill number and section and citing the record id.

**Files.** src/director/data/situation-types.json, src/director/data/director.json, src/director/scheduling.ts, src/director/purpose-scene.ts, src/core2/modules/legislature.ts, src/director/bargain-scenes.test.ts

**Notes.** TODO

Sent back 2026-10-24 from PR #5949 (branch words/bargain-scenes): new bargain-scenes.test.ts:14 and carried purpose-scene.ts:2 / purpose-scenes.test.ts:22 embed dated owner instructions forbidden by the merger morning check; retain the quotes in docs and remove the dated source notes; finish on that branch, merge main into it first.

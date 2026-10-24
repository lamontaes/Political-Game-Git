---
id: web-views-hear-conditions-moves-stance
title: "Hearing the town's conditions changed moves a reader's stance, as the owner ruled on Oct 22"
area: people
kind: wiring
priority: 1
size: M
status: open
claimed-by:
pr: #5879
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The owner ruled on Oct 22 that hearing a condition change the month's news carries (rent rose, unemployment rose, crime rose) moves the matching policy stance for the people the news reached, toward the side their own views already tie to that condition, by the existing heard-event amount, with the outlet as the reason. It is not built: the month's outcome record (outcome-news.ts monthEvent) carries a topic but no wanted change, so the press story made from it has none, the news engine never emits its read event for that story (news.ts onAfterDay skips a story with neither a wanted change nor a law), and the views engine moves no one. The effects lead's end-to-end proof needs this step.

**Rules.** Ask why: a reader's stance moves only when the story reached them, and the stance cites the story's news record as how they learned. No dice: the side each reader moves toward comes from their own current views on the condition's question, never a roll. One model, two tiers: a counted follower reached by the story is read by the same rule as a full one.

**Done when.** In a one-year buildBenchWorld run in a place drawn from all 56 (place and seed named), a month's outcome story about a moved condition reaches a named follower, and that follower's stance on the matching question moves by the views engine's heard-event amount toward the side their views tie to the condition, citing the story's news record id; a follower the story did not reach does not move. A test in src/core2/outcome-news.test.ts proves it and fails when the read event is removed.

**Files.** src/core2/modules/news.ts, src/core2/outcome-news.ts, src/core2/modules/views.ts, src/core2/data/news/outcome-news.json

**Notes.** Found by the effects lead on Oct 24 while tracing effects-end-to-end-proof. The ruling is in OWNER-DECISIONS.md under Oct 22 (web-views-from-conditions).

Sent back 2026-10-24 from PR #5879 (branch claude/affectionate-clarke-7dknew): Positive played-year witness rewrites web rent directly rather than ordinary condition producer; new dated owner annotations in news code must move to docs; finish on that branch, merge main into it first.

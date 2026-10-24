---
id: web-views-hear-conditions-full-readers
title: "Hearing the town's conditions changed moves a full reader's stance (the owner's Oct 22 ruling, for the readers who are full people)"
area: people
kind: wiring
priority: 1
size: S
status: claimed
claimed-by: claude/affectionate-clarke-7dknew
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T14:48:25.259Z
---

**What.** The full readers' half of web-views-hear-conditions-moves-stance, split from it on Oct 24 when a merger sent back #5879. A month's outcome record about a moved condition (rent, jobs, crime) becomes a press story with no wanted change. The news engine now emits its read event for such a story. Each full reader it reached takes the condition as a reason for the side their own view already holds on the matching question, by the views engine's heard-event amount, with the outlet as the source. The outlet's counted followers are only a count at delivery and do not move; that gap is registered as SG-PEOPLE-counted-readers-stories and built by people-counted-readers-stances-from-stories.

**Rules.** Ask why: a reader's stance moves only when the story reached them, citing the story's news record. No dice: the side comes from the reader's own current view, never a roll. One model, two tiers: the counted half is a registered stopgap with its own item, not a silent full-only rule.

**Done when.** In a one-year buildBenchWorld run in a place drawn from all 56 (place and seed named), a month's outcome story about a moved condition reaches a named full follower, and that follower's stance on the matching question moves by the views engine's heard-event amount toward the side their views tie to the condition, citing the story's news record id; a follower the story did not reach does not move; the counted followers' gap is registered as SG-PEOPLE-counted-readers-stories. A test in src/core2/outcome-news.test.ts proves it and fails when the read event is removed.

**Files.** src/core2/modules/news.ts,src/core2/outcome-news.ts,src/core2/data/news/outcome-news.json,src/core2/data/stopgaps.json

**Notes.** Split Oct 24 by the effects lead after Merger 3's send-back on #5879: the parent item web-views-hear-conditions-moves-stance keeps the two-tier rule and waits on people-counted-readers-stances-from-stories for its counted half.

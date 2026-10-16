---
id: gov-federal-hearings-filed-as-town
title: "Congress's chamber organizing and committee hearings are filed as town stories"
area: gov
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/gov-federal-hearings-filed-as-town
pr: #4584
blocked-on:
milestone:
source: "found closing gov-president-not-newsworthy: Liberty, New York, seed president-news-1"
claimed-at: 2026-10-16T03:41:07.448Z
---

**What.** `chamber-organized`, `committee-hearing`, `public-comment` and `bill-amendment` events for a federal (or state) body are emitted at the town place with no level, so the press files them as town news. Local television printed Congress organizing itself (10 stories in a year in Liberty, New York) and no national outlet printed it. Give each the level of its body, the way roll calls and signatures now carry it (`billReach` in `src/core2/modules/legislature.ts`).

**Rules.** An effect is a read; one rule, all 56 places.

**Done when.** In a drawn place, a year's federal `chamber-organized` and `committee-hearing` wire items are level `nation`, and a national outlet prints at least one by record id. Extend `src/core2/vote-level.test.ts`.

**Files.** src/core2/modules/legislature.ts, src/core2/modules/leadership.ts

**Notes.** Measured with the probe in the PR for gov-president-not-newsworthy.

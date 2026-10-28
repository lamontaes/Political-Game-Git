---
id: words-news-area-outside-metros-said-as-a-reader-would
title: "The first night's jobs story names an area outside the metros as a reader would, not with the state where the town goes"
lead: words
area: words
kind: bug
priority: 2
size: S
status: done
claimed-by: words/news-place-said
pr: #6483
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T02:17:40.340Z
---

**What.** The owner's 9 PM sitting (Oct 27, relayed by the CTO at 02:10 Oct 28): news outside Louisville and Lexington shows Kentucky as the place. In Hazard, Kentucky, the first night's town story read: Unemployment in Kentucky outside the Louisville and Lexington areas at 4.4. The rate is the regional engine's balance-of-state area, named by regionName with the state first, so the state's name stands where a reader looks for their town.

**Rules.** No hand-written player text: the words are headline and lede pieces with a slot, filled from the regional record. One rule, all 56 places: a state or territory with no metro area keeps its own name. Ask why: the area cites the region record.

**Done when.** In a drawn place outside its state's metro areas, the first night's jobs story says the area by what it is outside of (outside Kentucky's largest cities), never the state followed by outside the; a metro still says the Louisville area; a test over the opening's news fails on the old shape; the opening-unemployment-scope test passes on three seeds.

**Files.** src/director/opening-story.ts, src/core2/modules/regional.ts, data/english/parts/headlines.json, data/english/parts/news.json, src/director/opening-unemployment-scope.test.ts

**Notes.** Filed by the words lead on Oct 28 from the CTO's relay.

---
id: words-debate-answers-not-campaign-stops
title: "A debate's answers stage as campaign-stop scenes for each candidate"
area: words
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** On a debate day each candidate gets several campaign-stop scenes, one for each answer they gave, because the debate's answers are speech records the views engine reads, and the campaign-stop scene fires from any speech heard with the candidate as speaker. A campaign stop casts a volunteer and a crowd in the room, but a broadcast debate has neither, so these scenes put the wrong people in the wrong place. In Hainesburg, New Jersey (seed 8806321be2a3f9ab165d26019d4e7493d181cc7c, second draw), both governor candidates had four campaign-stop scenes on October 27, the day of debate:debate:contest:seat:US-NJ:governor:2025-11-04. The fix keeps the campaign-stop scene to speeches given face to face, as the campaign's own events are, and leaves a debate to its own scene.

**Rules.** Ask why: a scene's cast and place must match its cause record, and a broadcast answer has no room or volunteers. Wire to the world: the speech records still reach the views engine as they do now; only the scene they stage changes.

**Done when.** In the played world (buildBenchWorld), on places drawn from all 56 with a seed nobody chose, a test watches the candidates in a race that holds a debate and shows no campaign-stop scene caused by a speech record from that debate, while a campaign event's speech in the same world still stages its campaign-stop scene, both named by record id.

**Files.** src/director/data/situation-types.json, src/core2/modules/campaigns.ts, src/director/debate-opponent-scene.test.ts

**Notes.** TODO

---
id: words-story-read-closers
title: "A story-read talk closes its branches in more than a handful of words"
area: words
kind: bug
priority: 3
size: S
status: merged
claimed-by: story/story-read-closers
pr: #8148
blocked-on:
lead: words
source: "coordinator, Nov 10: story-read closes repeat within one talk (Okay. Go. We'll pick it up some other time.)"
merged-at: 2026-11-10T18:36:20.387Z
---

**What.** Twelve new close pieces for story-read (accept, thank, press, warn, promise), several also written for a walk-away; the existing thank/press/warn/promise closes also serve a walk-away. In src/director/scene-talk.ts a close not yet said anywhere in the talk is shown first, and a walk-away close rotates among the moves the talk has used least. Seed 211 (35 closes in one tree): 4 distinct closes, one said 15 times, before; 20 distinct, none more than 6, after. Seed 213: 17 distinct, none more than 6. Zero repeats is not reachable: a full tree has 35 closes and the bank 30-odd.

**Notes.** Research read: a From the Rock Wall oral history of two neighbors (people close a topic with a plain, small observation: "So we're fortunate to have peaceful neighbors."); the Medford Happenings local-radio transcript (a thank-you and a sign-off); WNYC's Brian Lehrer "news from your neighborhood" call-in (a short acknowledgment: "That's unfortunate.", "Thank you for your call."). Seed 211 (35 closes in the tree): 20 distinct, none more than 6, against 4 distinct and one said 15 times before; seed 213: 17 distinct, none more than 6.

**Done when.** Seeds 211 and 213 print no close said more than a few times; the gates above pass.

**Files.** data/english/parts/scene-talk.json, src/director/scene-talk.ts, src/director/reads-wrong-scenes.test.ts

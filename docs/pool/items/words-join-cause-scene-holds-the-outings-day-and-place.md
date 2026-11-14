---
id: words-join-cause-scene-holds-the-outings-day-and-place
title: "The join-cause scene holds the outing's day and place so a question about them can be answered"
area: director
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: design-words-machine
source: Rule 108 (Words lead, Nov 14), found by M1; coordinator ruling Nov 14 12:21Z
checked: M1 2026-11-14
---

**What.** The join-cause scene ("We're meeting Thursday about {cause}...") has the reply "Thursday works. What time?" answered by "Seven. The back room at the church. Bring a friend.", an hour and a room no record holds. Rule 108 says a question is offered only when a record answers it. Seen: the invited person asks where, and the answer names the outing's own place and day.

**Cause.** Found in code: the join-cause packet in `src/director/purpose-scene.ts` carries `cause` but not the outing's day or its place, so no answer line can be guarded on them; the two lines were left playing as a spot's only line (`data/english/parts/scene-talk.json`, keys `scene-talk.reply-agree.thursday-works-what-time` and `scene-talk.follow-thank.seven-the-back-room-at-the-church-bring-a-friend`).

**Fix.** Put the outing's day and place on the join-cause packet as facts `day` and `outing-place` from the outing's own record (the campaign events engine), then replace the two lines with the Words lead's wording "{day} works. Where?" / "{outing-place}. Bring a friend." guarded on those facts, and delete the old pair.

**Time box.** 2 hours, Sonnet.

**Rules.** No hand-written player text in code; the words are the Words lead's (rule-108-answer-lines.md, bottom).

**Done when.** In three drawn places, a played join-cause scene says the outing's day and place from its record and no scene says an hour or a room no record holds; `tests/english-answerable-asks.test.ts` baseline loses the two lines. A second session sees it in play.

**Waits on.** Nothing.

**Files.** src/director/purpose-scene.ts, data/english/parts/scene-talk.json, tests/english-answerable-asks-baseline.json

**Notes.** Filed by M1 on the rule 108 branch; routed by the coordinator to the campaign events builder.

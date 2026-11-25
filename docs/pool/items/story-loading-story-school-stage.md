---
id: story-loading-story-school-stage
title: "The loading story can say which stage of school the player started in town"
area: words
kind: wiring
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: story
model: sonnet
effort: medium
root: none
source: "CTO, Nov 24 19:54Z (7142760180 on #10377): file each missing fact as an engine item for its owner; the Story lead's question, 7142124378 on #10377"
checked:
---

**What.** The loading writer (W7) has run out of true facts for the `school` section. It can say the year, the town and the school's name, but not whether the player started there in first grade, middle school or high school. Seen: the loading screen's story of the player's life.

**Cause.** Found in code: `school.started` records carry `stage` and `grade` (src/core2/past-school.ts:152-160, set by `stageOf` at :106-111). The loading builder on story/w-loading (src/bench/loading.ts:72-79) reads that event for its year, place and state, but not its stage.

**Fix.** At that read, put `school-stage`, the stage said through the school engine's own stage words, with the event's id. W7 writes the lines.

**Time box.** 1 hour.

**Rules.** Read the existing record; no new one. No hand-written player text: the stage's words come from a bank, not from the stage key.

**Done when.** In a played world at a drawn place, the loading story's packet carries `school-stage` equal to the first `school.started` record's stage, by its id. A second session sees the loading story name the stage once W7's lines are in.

**Waits on.** Nothing. The code is on story/w-loading until it merges.

**Files.** src/bench/loading.ts (story/w-loading), src/core2/past-school.ts

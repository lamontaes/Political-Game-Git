---
id: story-loading-story-household-size
title: "The loading story can say how many people the player lives with"
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

**What.** The loading writer (W7) can say the player lives alone, or with someone older or younger. It can never say how many people share the home, so the `now` section reads alike across lives with very different households. Seen: the loading screen's story, in its `now` section.

**Cause.** Found in code: household members are on record (`HouseholdInput.memberIds`, src/core2/types.ts:233-236). The loading builder on story/w-loading (src/bench/loading.ts:218-236) filters the other members but puts only `lives-alone`, `lives-with-younger` and `lives-with-older`, never their number.

**Fix.** Put `household-size`, the count in words through `countSaid` (src/english/count-words.ts, as journal-evening.ts already does for the watchers), with the household's id. W7 writes the lines.

**Time box.** 1 hour.

**Rules.** One model, two tiers: the count is the household record's members, whoever they are, never a typed number. No hand-written player text: the number is said through `countSaid`.

**Done when.** In a played world at a drawn place where the player lives with others, the loading story's packet carries `household-size` equal to the household's member count in words, by the household's id. A second session sees the loading story say it once W7's lines are in.

**Waits on.** Nothing. The code is on story/w-loading until it merges.

**Files.** src/bench/loading.ts (story/w-loading)

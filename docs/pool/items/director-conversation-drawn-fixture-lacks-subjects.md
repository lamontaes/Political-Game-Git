---
id: director-conversation-drawn-fixture-lacks-subjects
title: "Conversation checks lack their required people and recorded subjects in drawn worlds"
area: director
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/conversation-fixture
pr: #6264
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T08:04:39.246Z
---

**What.** The unchanged conversation.test.ts fails five cases on clean main 4224ff282f7c9bf27484ecfc0e9732b300417663 with GOLDEN_PATH_SEED=73c923c17512af13e91da2b47cedc12f, Gibson, Georgia. The selected actor has no qualifying relative pairs, no doubter and no news row for several checks. These are input setup failures before the intended conversation behavior can be observed, and they also fail during unrelated changed-file gates.

**Rules.** One rule, all 56 places: choose eligible actors and subjects from opening input records before testing behavior, without selecting by observed conversation output. Keep assertions nonempty and retain the independent failing root; never skip a missing subject or redraw after a result.

**Done when.** The full src/director/conversation.test.ts file passes on the named Gibson seed and three independent drawn places with seeds named in the PR, while each existing assertion still exercises its intended subject and a disabled behavior fails the relevant assertion.

**Files.** src/director/conversation.test.ts, src/director/conversation.ts

**Notes.** TODO

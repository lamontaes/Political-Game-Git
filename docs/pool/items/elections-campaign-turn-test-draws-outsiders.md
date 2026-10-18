---
id: elections-campaign-turn-test-draws-outsiders
title: "campaign-turn.test picks a national outlet's head as a rival and a zero-lean nominee as the sliding-scale proof"
area: elections
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr: #4885
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

Sent back 2026-10-17 from PR #4885 (branch claude/campaign-turn-test-draws-s5): Morning check: campaign-turn.test.ts changes the continuous-position assertion from da.some(...) to [...da, ...rb].some(...), so the other nominee can now hide a broken all-discrete response for the originally tested nominee. Preserve the original per-nominee guarantee, or draw a case with a non-canceling view/party pull and assert that candidate has a continuous response. The eligible-filing fixture change can stay.; finish on that branch, merge main into it first.

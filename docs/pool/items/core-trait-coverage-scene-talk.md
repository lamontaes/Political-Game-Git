---
id: core-trait-coverage-scene-talk
title: "trait-coverage fails on main: scene-talk picks an asker's answer by its own trait pulls, outside the decision table"
area: words
kind: bug
priority: 2
size: S
status: in-pr
claimed-by:
pr: #5997
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The trait coverage test (src/core2/trait-coverage.test.ts, 'finds every decision in code that weighs traits') fails on clean main because src/director/scene-talk.ts decides with traits but has no row in data/content/trait-decisions.json. Its pullOf sums per-move trait pulls from the purpose-arc data to pick the asker's answer and the branch the page follows first, a hand trait sum beside the shared table. Give the decision a table row whose options carry act kinds and read the lean through the shared helper, or list the site under outside with the reason, whichever the words line's design allows.

**Rules.** No dice: the answer stays chosen by the asker's traits weighing each move, never a roll. One model, two tiers: the same lean the chooser uses must reach the scene so a person answers in talk the way they decide elsewhere.

**Done when.** src/core2/trait-coverage.test.ts passes on main with src/director/scene-talk.ts either in the decision table or under outside with its reason, and src/director/scene-talk.test.ts still passes; a played-world talk in a drawn place, seed named, shows the asker's answer following their lean.

**Files.** src/director/scene-talk.ts, data/content/trait-decisions.json, src/core2/trait-coverage.test.ts

**Notes.** Found Oct 24 by the traits lead while landing the money family: red on main at 7b30a85cd, so it does not block family PRs.

Sent back 2026-10-25 from PR #5997 (branch claude/traits-scene-talk-table): Lead traits branch edits Words-owned director scene-talk logic, arcs, rules and tests; route that portion through Words or explicit applicable ownership ruling, then rerun integrated scene/coverage/played-talk proof; finish on that branch, merge main into it first.

Oct 25 (traits lead): handed to the Words line, as the send-back asks. Branch `claude/traits-scene-talk-table` (PR #5997, head 8c6da3b4d1, main merged in) holds a working version: one `scene-talk.move` row in the shared decision table (40 moves with act kinds), the asker's answer and the player's lead read through the trait lean, the per-move pulls in purpose-arcs.json removed, and a played-talk proof in Kalamazoo, Michigan. The Words session claims this item to take the branch and keeps, changes or replaces that design; the traits lead makes no further src/director edits on it.

Sent back 2026-10-25 from PR #5997 (branch claude/traits-scene-talk-table): Words takeover accepted; current main integration conflicts in src/director/scene-talk.ts after English seam move; preserve current seam and shared trait reader, rerun scene/coverage/played-talk gate; finish on that branch, merge main into it first.

Sent back 2026-10-25 from PR #5997 (branch claude/traits-scene-talk-table): new scene-talk opposite-lean acceptance test fails at line318 in argument on fc0e5511905a6541, reproduced alone: -0.21739130434782591 < 0.6086956521739126; finish on that branch, merge main into it first.

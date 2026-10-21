---
id: release-red-budget-desk-president-stories
title: "budget-desk test: no stories on the president's signature or veto of the federal budget (expected 0 to be greater than 0, budget-desk.test.ts:62)"
area: gov
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/pool-red-budget-desk
pr: #5320
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T23:04:23.058Z
---

**What.** src/core2/budget-desk.test.ts failed at line 62: the president signed or vetoed the federal budget, but no national outlet printed a story about it. The press desk weighed the act as touching only the few people it named, and a serving president is not a full person, so the story carried no renown. A budget the executive signs or vetoes must count every follower of the outlet as involved, and a serving federal or state official named on the record must count toward renown.

**Rules.** An effect is a read, not a record: the signature is read by the press desk when it picks stories, and the printed story reaches followers through the news engine. One model, two tiers: counted followers are involved by the same rule as named ones.

**Done when.** src/core2/budget-desk.test.ts passes in a played world built with buildBenchWorld in a drawn place: the president's signature or veto of the federal budget is recorded, a national outlet prints at least one story on it, and the PR body names the place, seed and story record id.

**Files.** src/core2/press-desk.ts, src/core2/press-topics.ts, docs/release/changes/gov-budget-signing-reaches-the-press.md

**Notes.** Found red on main.

Sent back 2026-10-20 from PR #5320 (branch claude/pool-red-budget-desk): merge conflict with main in press-desk.ts (code); finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5320 (branch claude/pool-red-budget-desk): docs/release/changes/gov-budget-signing-reaches-the-press.md:3 declares impact none, but its text and press-desk.ts change which national-outlet stories print and what every follower hears. That is a live news/choice input read by other engines, not a source-only repair. Use an accurate patch declaration and describe the actual budget-signature and serving-official reach. The merged fixer resolved the conflict but did not correct this release claim.; finish on that branch, merge main into it first.

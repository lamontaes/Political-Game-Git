---
id: release-main-red-guards-merge-race
title: "Main is red under the guards: a kit count and a director literal from a merge race"
area: release
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: claude/main-red-guards
pr: #6519
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T03:56:35.505Z
---

**What.** The guards job is red for every pull request because two guards fail on main. The News mockups added two markup builders to play.mjs while the kit guard's baseline was counted without them, so main has 329 against a known 327. The working life before the start left a literal 1 in src/director/journal.ts, which the director's numbers guard refuses.

**Rules.** Replace, never layer: the journal reads the next spell without a typed number, and the kit baseline records what main held when its guard landed. Every number lives in a parameter table, so no literal stays in director code.

**Done when.** npm run guards passes all fourteen guards on the fix branch merged with main, src/director/journal.test.ts passes, and the kit-only-ui and director-numbers-in-data guards fail on main without the fix, as shown in the PR body.

**Files.** src/director/journal.ts, tests/guards/kit-only-ui-baseline.json

**Notes.** TODO

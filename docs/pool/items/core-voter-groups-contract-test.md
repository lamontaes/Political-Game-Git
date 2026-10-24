---
id: core-voter-groups-contract-test
title: "M0-09 names src/core2/voter-groups.test.ts, which does not exist: voter groups have no contract test of their own"
area: core
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/quirky-ride-vrwwz4-voter-groups
pr: #5871
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T04:31:53.771Z
---

**What.** Roadmap M0-09's command runs vitest on src/core2/voter-groups.test.ts with three other contract tests. That file is not on main (b09ba675cd), and vitest passes the command anyway because it runs whichever named files exist. So M0-09 reads green while one of its four core pieces, voter groups, has no contract test. Find where voter groups live in src/core2 and write their contract test at that path, or point the command at the existing one.

**Rules.** Wire to the world: the contract test reads voter groups from a played world built with buildBenchWorld in a drawn place, not a hand-made fixture. One rule, all 56 places: the place is drawn and named.

**Done when.** src/core2/voter-groups.test.ts exists and passes in a place drawn from all 56 (place and seed named in the PR body), fails when voter groups stop being built, and the M0-09 command runs four test files.

**Files.** src/core2/voter-groups.test.ts, docs/roadmap/features.json

**Notes.** Found by the M0-M2 lead's baseline run, Oct 24. Blocks roadmap M0-09.

Sent back 2026-10-24 from PR #5871 (branch claude/quirky-ride-vrwwz4-voter-groups): New voter-groups test lines 108-116 skips all unmatched sample rows and never asserts positive counted-adult sample coverage; named-only fallback could pass; finish on that branch, merge main into it first.

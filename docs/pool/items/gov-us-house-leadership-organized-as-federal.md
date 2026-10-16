---
id: gov-us-house-leadership-organized-as-federal
title: "The U.S. House's leadership is written as a town council's under 'council-president'"
area: gov
kind: bug
priority: 2
size: S
status: done
claimed-by:
pr: #4667
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** On December 15, 2025 the U.S. House's leadership is written under 'council-president', naming a member of the home delegation, because the leadership engine does not recognize the delegation's House office (leadership.ts) and falls back to the council layout. Organize the House by the federal layout (speaker, majority and minority leaders, whips).

**Rules.** No dice; an effect is a read; one rule, all 56 places; ask why (record ids); the chain is the acceptance.

**Done when.** In a drawn place the U.S. House has a speaker and floor leaders, not a council president, by post record ids. Shown in a played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, with the test named and the record ids that prove it.

**Files.** src/core2/modules/leadership.ts

**Notes.** The trace audit of Oct 14 (docs/reports/trace-audit-2026-10-14/README-TRACE-5.md); not re-checked on main today beyond the code location.

Sent back 2026-10-16 from PR #4667 (branch claude/house-leadership): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.

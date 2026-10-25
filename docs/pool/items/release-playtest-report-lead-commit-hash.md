---
id: release-playtest-report-lead-commit-hash
title: "The Oct 24 playtest report puts a commit hash in its lead and fails skill-ops"
area: release
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: claude/playtest-report-lead
pr: #5988
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-25T06:42:57.929Z
---

**What.** The October 24 playtest report starts its lead with the tested commit hash 4c943f3. The report checker rejects that method detail in the lead, making test:skill-ops fail on clean main. Move the build identifier to the method while keeping the lead focused on what happened in play and why it matters. Preserve the underlying playtest observations and release identification.

**Rules.** Ask why: preserve the exact tested commit in the method so readers can identify the build behind the observed behavior. Keep it simple: move the existing method detail below the lead without weakening the report checker or changing the playtest findings.

**Done when.** scripts/report-check/report-check.test.ts passes on clean main with this report present; its lead explains player-visible behavior without a commit hash, and a later method paragraph preserves release v0.22.10 and commit 4c943f3. The checker and its standards are unchanged.

**Files.** docs/reports/playtest-2026-10-24.md, scripts/report-check/report-check.test.ts

**Notes.** Merger 1 found this while gating PR #5917: skill-ops157pass1reportfailure, reproduced identically on clean main fc7232fa95. The Words PR does not change this report.

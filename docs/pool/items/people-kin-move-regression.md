---
id: people-kin-move-regression
title: "Pin the Scenic, Arizona kin move date fix"
area: people
kind: bug
priority: 3
size: S
status: done
claimed-by:
pr: #4640
blocked-on:
source: "core-needs-core-172 triage, Oct 15"
claimed-at:
---

**What.** Opening Scenic, Arizona (seed 17290bfc...) once crashed on a kin move dated after the start. The clamp is in `opening-kin.ts`, but no test names the case.

**Rules.** Tests draw a place; a regression names its place and seed.

**Done when.** A test opens Scenic, Arizona with that seed and a drawn place and asserts every kin move date is at or before the start, naming the place, seed and one kin record id.

**Files.** src/core2/opening-kin.test.ts

**Notes.** core.md line 223, checked Oct 15; the full seed is in the core.md bullet.

Sent back 2026-10-16 from PR #4640 (branch claude/kin-move-regression): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.

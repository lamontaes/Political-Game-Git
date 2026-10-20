---
id: release-audit-17-misstated-release-notes
title: "Correct the release notes that misstate their change (#5218, #4863, #4948, #5021, #5322, #5258)"
area: release
kind: bug
priority: 3
size: S
status: in-pr
claimed-by: claude/political-game-pool-76ksvw
pr: #5180
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T04:32:24.175Z
---

**What.** Correct each note to say what changed: #5218 changes 51 House and 30 legislative rows with 22 House rows on the flat estimate, #4863 drift engine gone, #4948 partial moves hand lease payers to those who stay, #5021 edits landed in #5266, #5322 sample caps at 10,000, #5258 no screen offers the act yet.

**Rules.** Replace, never layer: the fix replaces the faulty code, text or note in the same change, and a test asserts the feature and fails when nothing is found.

**Done when.** The release check passes and each of the six declarations states the real change, shown by reading the diff against each PR.

**Files.** docs/release/changes

**Notes.** Item 17 of docs/reports/merge-audit-2026-10-20.md, split from release-merge-audit-oct20-fixes.

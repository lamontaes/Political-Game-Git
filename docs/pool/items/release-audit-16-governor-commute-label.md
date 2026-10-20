---
id: release-audit-16-governor-commute-label
title: "Relabel the governor commute release note and file computer-governor clemency (#4871)"
area: gov
kind: bug
priority: 3
size: S
status: in-pr
claimed-by: claude/political-game-pool-76ksvw
pr: #5180
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T04:32:17.754Z
---

**What.** Relabel the release note to say only a player governor can use the commute power and no screen offers it, and add a pool item for computer governors acting on clemency.

**Rules.** Replace, never layer: the fix replaces the faulty code, text or note in the same change, and a test asserts the feature and fails when nothing is found.

**Done when.** The release note says what is reachable, and a new pool item exists for computer governors on clemency with a done-when line naming a test.

**Files.** docs/release/changes, docs/pool/items

**Notes.** Item 16 of docs/reports/merge-audit-2026-10-20.md, split from release-merge-audit-oct20-fixes.

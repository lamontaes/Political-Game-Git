---
id: release-audit-17-misstated-release-notes
title: "Correct the release notes that misstate their change (#5218, #4863, #4948, #5021, #5322, #5258)"
area: release
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** Correct each note to say what changed: #5218 changes 51 House and 30 legislative rows with 22 House rows on the flat estimate, #4863 drift engine gone, #4948 partial moves hand lease payers to those who stay, #5021 edits landed in #5266, #5322 sample caps at 10,000, #5258 no screen offers the act yet.

**Rules.** Replace, never layer: the fix replaces the faulty code, text or note in the same change, and a test asserts the feature and fails when nothing is found.

**Done when.** The release check passes and each of the six declarations states the real change, shown by reading the diff against each PR.

**Files.** docs/release/changes

**Notes.** Item 17 of docs/reports/merge-audit-2026-10-20.md, split from release-merge-audit-oct20-fixes. Released from idle draft #5180 by the CTO, Oct 26.

Lane 5 (pool truth, Nov 3): the item was open but still named an old claim, `claude/political-game-pool-76ksvw` (2026-10-20). Cleared from the front matter and kept here.

**Notes (pool redo, Nov 10, proposed for the CTO).** Proposed: drop, replaced. The six notes named (#5218, #4863, #4948, #5021, #5322, #5258) are no longer in docs/release/changes; the release machinery consumed them (docs/release/consumed-changes.json, Release 0.100.0), and a shipped note is history, not a file to edit. Low confidence: if the owner wants shipped notes corrected, that is a changelog edit, not this item.

---
id: release-merge-audit-fix4-browser-assertions
title: "Require real Campaigns rows and one of each outing in the browser check"
area: release
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/audit-fix4-browser
pr: #5818
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-26T10:20:40.989Z
---

**What.** The Campaigns browser check originally announced that the screen listed no acts without asserting it. Its first repair could skip every campaign row, and four copies of one outing met a length-only check. Finish only the browser-assertion part of audit fix 4; the broader morning-audit umbrella still depends on the separately tracked research-reader guard.

**Rules.** Wire to the world: run the existing bench and real filing flow in a place drawn from all 56, and require a nonempty checked row. Replace, never layer: assert exactly one of each named outing and absence of the old Today heading without skipping or narrowing assertions.

**Done when.** Main is normally merged and the changed-file checks pass in the merger's own environment. In a drawn place from all 56, src/bench/campaign.browser.mjs passes against that bench; the PR body names the place, seed, checked head, and result. The browser test requires at least one applicable campaign row, no Today heading, and exactly one Knock on doors, Hold an event, Ask for an interview, and Call donors control per checked row.

**Files.** src/bench/campaign.browser.mjs, docs/release/changes/audit-fix4-campaigns-browser-check.md

**Notes.** TODO

Merger 2: Bounded browser-assertion part of audit fix 4 in PR #5818. The broader release-merge-audit-oct20-morning-fixes remains OPEN: its named research-reader guard still fails on clean main b3c06e202f33329975fea51180677e39df87afce (3 of5 pass in14.64s), tracked by release-red-research-reader-census-rerun. This item completes only the non-vacuous Campaigns browser assertions.

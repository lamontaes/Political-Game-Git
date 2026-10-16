---
id: release-green-suite
title: "Finish #4309: the unit suite follows what the game does now"
area: release
kind: cleanup
priority: 2
status: open
claimed-by:
pr: #4309
blocked-on:
milestone:
source: "astra order 2; PR #4309 branch release/green-suite"
claimed-at: 
---

**What.** A test of the retired old core is deleted with a line in the PR body; a test of the new core, bench, director or release machinery that broke is fixed at the root, never skipped.

**Rules.** Never skip or loosen a test.

**Done when.** Changed tests pass; deletions listed in the PR body.

**Files.** tests, src/**/*.test.ts

**Notes.** #4316 (release contract test) already merged. Overlaps #4354.

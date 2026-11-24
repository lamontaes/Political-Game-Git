---
id: gov-council-meeting-intervals
title: "Council meeting interval table by body type and size (#2880)"
area: gov
kind: research
priority: 2
status: dropped
claimed-by: claude/gov-council-meeting-intervals
pr: #2880
blocked-on:
milestone:
source: "open PR #2880"
claimed-at: 2026-10-16T03:47:51.374Z
---

**What.** Data JSON and councilMeetingInterval lookup; ESTIMATED with cited examples. Merge main, gate line, and a reader in play (the calendar).

**Rules.** Merge main into the PR branch (plain merge, never force); a release declaration in docs/release/changes/.

**Done when.** The PR is mergeable with its gate line; the CTO merges.

**Files.** see PR

**Notes.** Read the PR body and any CTO comment first.

Sent back 2026-10-16 from PR #2880 (branch claude/oct6-builder-l3-ps46ao-b05-p6-research): morning check: the only code is src/simulation/living-world/council-meeting-interval.ts (old core, which takes no new features) and nothing reads it (only its own test imports it), so it is a record nothing reads. The meeting-interval data should be read by the core2 meeting calendar (src/core2/office-day-calendar.ts) in the same change, and the PR body needs a gate line; finish on that branch, merge main into it first.

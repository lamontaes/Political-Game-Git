---
id: director-m4-06-the-record-follows-you
title: "M4-06 The record follows you (step 11)"
area: director
kind: feature
priority: 3
size: L
status: in-pr
claimed-by: claude/director-m4-verify-2
pr: #5350
blocked-on:
milestone: M4
source: "docs/roadmap/later-specs-draft.md M4-06"
claimed-at: 2026-10-20T00:47:44.519Z
---

**What.** The next election reads your votes, promises kept or broken, what changed, and anything that surfaced. (Owner: OPUS-GOV.)

**Rules.** Spec approved by the owner Oct 12; AGENTS.md rules.

**Done when.** An opponent and voters cite the player's real record in the next campaign.

**Files.** see spec

**Notes.** Verified Oct 19 (claude/director-m4-verify-2), not rebuilt. src/core2/record.test.ts (2 pass, a random place): an incumbent's broken promise changes specific voters' choices at the next election, each with its reason on their ballot, and the rival's attack ad draws on it and only on it. Its council vote is written through recordVote as an edge-case fixture, as the test header says, so the proof that a council member's own played vote feeds the next campaign rests on the golden-path item play-golden-path-one-life. Priority 3 until scheduled. Verify how much is built before starting.

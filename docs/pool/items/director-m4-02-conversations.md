---
id: director-m4-02-conversations
title: "M4-02 Conversations"
area: director
kind: feature
priority: 3
size: L
status: in-pr
claimed-by: claude/director-m4-verify
pr: #5345
blocked-on:
milestone: M4
source: "docs/roadmap/later-specs-draft.md M4-02"
claimed-at: 2026-10-20T00:45:55.769Z
---

**What.** Every choice names something real, there's a Lie button beside the replies, and every line comes from the English engine, graded by the owner in batches. (Owner: OPUS-PEOPLE.)

**Rules.** Spec approved by the owner Oct 12; AGENTS.md rules.

**Done when.** Every conversation choice names a real subject, no line is hand-written, and the owner has graded a batch.

**Files.** see spec

**Notes.** Verified Oct 19 (claude/director-m4-verify), not rebuilt. src/director/conversation.test.ts (33 director tests pass with journal.test.ts): four distinct replies every turn, each answering the last line; every choice turned false by the Lie scales, each contradicting the player's record; talk keeps to one topic; strangers ask only what they do not know. tests/canned-content-guard.test.ts passes (no hand-written lines); the owner has graded 5 batches (data/english/part-grades.json lists batch-1, -2, -7, -9 and more, 86 parts graded). Remaining by the spec: more batches graded as the bank widens (words-batch-15, words-pack-scene-talk). Priority 3 until scheduled. Verify how much is built before starting.

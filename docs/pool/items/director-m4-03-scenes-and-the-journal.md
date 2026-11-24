---
id: director-m4-03-scenes-and-the-journal
title: "M4-03 Scenes and the journal"
area: director
kind: feature
priority: 3
size: L
status: done
claimed-by: claude/director-m4-verify
pr: #5345
blocked-on:
milestone: M4
source: "docs/roadmap/later-specs-draft.md M4-03"
claimed-at: 2026-10-20T00:45:59.187Z
---

**What.** Scene narration in second person; "My life" in first person, selective, never inventing a feeling. (Owner: OPUS-PEOPLE.)

**Rules.** Spec approved by the owner Oct 12; AGENTS.md rules.

**Done when.** A year's journal reads as a story, and every statement traces to a record.

**Files.** see spec

**Notes.** Verified Oct 19 (claude/director-m4-verify), not rebuilt. src/director/journal.test.ts passes: the life is told in chapters with each line traced to a record, relatives are named by relation, the journal never invents a feeling, a school, workplace or visit is never an entry by itself, and a relative's race is told by the record's result. Scene narration in second person is covered by the scene tests (src/director/scene.test.ts, 33 director tests pass with conversation.test.ts). The pass condition holds; a year of journal read as a story still needs the owner's read. Priority 3 until scheduled. Verify how much is built before starting.

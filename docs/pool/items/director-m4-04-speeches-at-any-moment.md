---
id: director-m4-04-speeches-at-any-moment
title: "M4-04 Speeches at any moment"
area: director
kind: feature
priority: 3
size: L
status: done
claimed-by: claude/director-m4-verify-2
pr: #5350
blocked-on:
milestone: M4
source: "docs/roadmap/later-specs-draft.md M4-04"
claimed-at: 2026-10-20T00:47:40.875Z
---

**What.** Give a speech anytime; each listener reacts by who they are, and it gets retold to family and friends. Movements come after early access. (Owner: OPUS-PEOPLE.)

**Rules.** Spec approved by the owner Oct 12; AGENTS.md rules.

**Done when.** A speech changes specific listeners' views, and some retell it.

**Files.** see spec

**Notes.** Verified Oct 19 (claude/director-m4-verify-2), not rebuilt. src/core2/speech.test.ts (3 pass): a speech moves listeners near the speaker's lean more than far ones, is retold by some listeners and not all (the retelling moves their household), and leaves people who neither heard it nor were told untouched. src/director/speech-builder.test.ts (3 pass): four choices at each of four stages, the core parts on different subjects, and a different speech from different choices; each stand goes to the speech engine and the audience's views read it. The pass condition holds. Movements stay after early access. Priority 3 until scheduled. Verify how much is built before starting.

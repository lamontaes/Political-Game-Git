---
id: words-batches-as-artifacts
title: "Every grading batch goes to the owner as an artifact he grades in, built by the Words session"
area: words
kind: feature
priority: 1
size: S
status: claimed
claimed-by: words/batches-as-artifacts
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T04:17:41.986Z
---

**What.** The owner, Oct 24, to the Words session: You're supposed to give me the batches in an artifact. Batch 22 went to him only as a Markdown page and JSON, because the words-engine skill said the CTO builds the grading artifact from the Markdown. The Words session now publishes each batch itself: batch 22 is a claude.ai artifact whose grades save to its own store as he taps Good, Bad or Fix. The page builder lives in the repo so the next held-line batch is built the same way, and the skill says who publishes and how the grades come back into data/english/grades.

**Rules.** No hand-written player text: the page shows the bank's own lines and record notes, never new wording, and every line stays held until graded. Look before you ask: the owner's instruction is quoted in the skill, so no session asks him again who builds the grading page.

**Done when.** scripts/dialogue-batch/held-page/build.py builds the batch 22 page from data/english/batches/batch-22.json, the published artifact saves a test grade to its store and the session reads it back with ArtifactData, and both copies of the words-engine skill say the session publishes each batch and folds the grades.

**Files.** scripts/dialogue-batch/held-page/build.py, scripts/dialogue-batch/held-page/template.html, .agents/skills/words-engine/SKILL.md, .claude/skills/words-engine/SKILL.md

**Notes.** TODO

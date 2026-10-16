---
id: words-unworded-moments
title: "Unworded moments the corpus does not cover twice yet"
area: words
kind: feature
priority: 2
status: done
claimed-by: claude/words-unworded-moments
pr: #4563
blocked-on:
milestone:
source: 'words-and-director "What is open"; docs/coordination/words.md'
claimed-at: 2026-10-16T02:58:29.565Z
---

**What.** Several moments the records fire have no words, or thin ones: 'I filed my papers.', 'I paid the fee.', 'A new law took effect.', a clerk saying the fee or signature count, 'Hold a meeting', thin scene narration, the misfit 'It's okay.' offered in answer to 'Where did you go to school?', and the blame someone was told. Mine or author each so the corpus covers it at least twice and fix the misfit offering. The player would notice that filing for office and a law taking effect are spoken, and that answers fit their questions.

**Rules.** No hand-written player text: the words come from the English engine's banks in `data/english/parts/`, authored with `origin: authored`, author and date or mined from public-domain sources with the source recorded; nothing is typed into code or a screen; American English: spellings follow `tests/american-english-sweep.test.ts` (run `npm run spelling`); An effect is a read, not a record: the director reads the new parts when the filing, fee, law-effect and blame records fire; Ask why: each line cites the event or record it voices; No dice: the speaker and the line follow traits and the record, not a roll; Look before you ask: owner rulings (filing, fee and blame) are in OWNER-DECISIONS.md; read them first; Research before building: mined lines are public domain with the source recorded; One rule, all 56 places: no place or person named; This is a game, not a spreadsheet: a clerk's words say the fee or count the place's records give; no new player step.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): the filing visit and a law taking effect each produce worded lines (filing and law record ids named), the misfit answer is no longer offered to the school question (a test in `src/director/conversation.test.ts`), and the lines are composed through the real engine in a drawn place (named, with seed) and graded by the owner in the next words batch page under `docs/grading/`. Tests in `tests/english-parts-banks.test.ts`. The owner plays it: files for office and hears the clerk say the fee.

**Files.** data/english/parts/filing-visit.json, data/english/parts/conversation.json, data/english/parts/scene-words.json, src/director/filing-visit.ts, scripts/english-corpus/

**Notes.** Rewritten to the quality gate 2026-10-15.

**Done in the PR for this item (Oct 16).** The misfit answer is fixed: "Where did you go to school?" is answered only with where or that they are done (conversation-rules `answerMoves`). The rest, with the fee and signature lines dropped under the Oct 13 ruling, is `words-unworded-moments-remaining`.

---
id: words-main-line
title: "Main line:"
area: words
kind: feature
priority: 2
status: in-pr
claimed-by: claude/words-main-line
pr: #5242
blocked-on:
milestone:
source: "docs/coordination/words.md line 46 (unchecked checklist line)"
claimed-at: 2026-10-19T22:16:26.286Z
---

**What.** The Words main line is the journal as a memoir with procedural revisions and the director's scenes, which the owner ruled come first. Today the journal states each event once and never revises it. Build the memoir shape: first-person entries grounded in records, with later entries revising earlier ones when the record changes the meaning ('I thought it was nothing; it turned out to be the start of everything'), only when the record shows it. Batch 9 is the first page for this, and its grades steer the rounds. The player would notice a journal that reads like a life told back, with the older entries gaining hindsight.

**Rules.** No hand-written player text: the words come from the English engine's banks in `data/english/parts/`, authored with `origin: authored`, author and date or mined from public-domain sources with the source recorded; nothing is typed into code or a screen; American English: spellings follow `tests/american-english-sweep.test.ts` (run `npm run spelling`); An effect is a read, not a record: the journal composer reads the record graph (cause, effect, later events) when it revises an entry; Ask why: a revision cites the later record that changed the meaning; 'That was a turning point' appears only when the record shows it was one (owner ruling, Oct 15); No dice: revision follows the records, never a roll; Sliding scales and causes: hindsight slides with how much the later events weighed, with no threshold flip; One rule, all 56 places: no place or person named; Replace, never layer: the once-only entry path is replaced by the revisable one, with the old rows deleted; Look before you ask: the journal rulings are in OWNER-DECISIONS.md under the batch grading rulings.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): a journal for the year shows at least one entry revised by a later record (original and revising record ids named) and none revised without one, composed through the real engine in a drawn place (named, with seed) and graded by the owner in the next words batch page under `docs/grading/`. Tests in `src/director/journal.test.ts`. The owner plays it: reads his journal after a year and sees an early entry told again with hindsight.

**Files.** src/director/journal.ts, src/director/data/journal-rows.json, data/english/parts/journal.json, src/director/mined/journal-bank.ts

**Notes.** Checklist line from words.md; verify against main before starting.

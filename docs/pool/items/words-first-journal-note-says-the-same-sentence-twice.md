---
id: words-first-journal-note-says-the-same-sentence-twice
title: "The first Journal note of a new life names where a parent went to work, and says a job and an employer the way people say them"
area: words
kind: bug
priority: 1
size: S
status: merged
standard: 2
claimed-by:
pr: 8772
after:
blocked-on:
lead: words
model: opus
effort: medium
root: rc4-hand-written-words
source: lead's walk of a new life on main, Nov 11, 2026 (Athens, Michigan, seed f8aee52b-7aa0-45a2-a3f7-6820913dd30f)
checked:
claimed-at:
branch:
---

**What.** The first screen of a new life shows a Journal note about the family. In Athens, Michigan it read: "A year and a half on, my father went to work somewhere new. My father went to work somewhere new. My brother Darius is a chief Administrative Officer at Village of Athens treasury. My father Matthew works as a stocker at Michael's Market." The same sentence twice, no employer in it, and a job and an employer worded as a form prints them. It is the first thing a new player reads. Seen: the Journal note at the lower right of the first screen of a new life, and the same lines in the Journal.

**Cause.** Found in code: in src/director/journal.ts the loop over a parent's past work spells (`pastWorkOf`, kind `PAST_WORK_SPELL`) pushes a moment with `causeKind: "household:moment:parent-new-job"` and the parent as counterpart, and no `actFacts`. The spell's own record holds `organizationId` and `startedAt` (src/core2/past-work.ts), and the journal passes neither. The bank's three wordings for the move `work-line-parent-job` in data/english/parts/journal.json carry only `{other}` ("{other} went to work somewhere new."), so two spells give the same sentence twice. The brother's line prints the position and the employer as the records spell them: "a chief Administrative Officer", "at Village of Athens treasury".

**Fix.**

1. **Pass what the spell holds.** The parent-new-job moment gets `actFacts`: `employer` (the organization's name through the reader in step 3, citing the organization's record and the spell's) and `when` (the year, or the player's age then, as the Journal's other lines say a time). A spell with no organization on record is not told.
2. **Wordings that name it.** Replace the three wordings of `work-line-parent-job` with at least eight that carry `{employer}` and `{other}` ("{other} took a job at {employer}."), and four that also carry the time. Delete the three with every reference; none is graded good (check `data/english/part-grades.json` first).
3. **One reader for how a job and an employer are said.** In src/english (beside `withArticle` in src/english/journal-words.ts): a job title in a sentence is lower case unless it is a proper title before a name ("a chief administrative officer"); an employer that is a government or an office takes "the" ("the Village of Athens treasury"); a business keeps its name. From the record's kind, never a list of names. The Journal's lines about relatives' jobs use it. Tell the builder of `words-home-work-lines-are-composed` the reader's name on the crew's issue, so the work talk uses the same one.
4. **Two tellings never read the same.** When two moments of one kind fall in one Journal entry, the second takes a different wording and its own facts; when their facts are the same too (the same parent, the same employer), they are told once.
5. **When two relatives share a relation word,** each is named: "My father Ray", "My father Matthew".
6. **Tests, on drawn places:** in ten new lives, no sentence of the first Journal note appears twice in it; every parent-new-job line names an employer that is in that parent's work record; no job title has a capital inside a sentence. Run tests/guards/english and the Journal's own tests.

**Time box.** 3 hours for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No hand-written player text in code: every wording is in the bank. Ask why: the line cites the spell's record and the organization's. One rule, all 56 places: the reader decides by the record's kind. One screen names a thing once, and a thing is said the way people say it (skill `words-engine`, lessons of Nov 11).

**Done when.** A second session, in the running game on main at 1440x900, starts three new lives in drawn places it writes down with their seeds and reads the Journal note on the first screen. No sentence is in a note twice, each parent's job change names the employer, and it opens that parent's card and finds the same employer in their story. No job title is capitalized inside a sentence, and a government employer reads with "the".

**Waits on.** Nothing.

**Files.** src/director/journal.ts, src/english/journal-words.ts, src/core2/past-work.ts, data/english/parts/journal.json, data/english/part-grades.json, src/director/journal-opening.test.ts, tests/guards/english/line-inserts-baseline.json

**Notes.** Found by the lead on Nov 11, 2026, playing the opening on main at 3a9e824ddd. The note's first words there, "A year and a half on,", come from the piece `{span} on.` and are right when a line stands before them; if the note can start on that piece with nothing before it, say so in the pull request.

Built by Words builder W8 in #8772, merged 2026-11-11 11:54 UTC (ebbd2654d55d673671c34a39240dcb83750e5bfe), whose line 1 names this item; the merge did not flip the status, so it is set here by hand. The journal reader for a job and an employer is `employerName` and the livelihood moments in `src/director/journal.ts`. Not yet seen in the game by a second session.

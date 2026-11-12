---
id: past-work-journal-line-missing-ozan
title: "The working life's Journal check fails in Ozan, Arkansas: a past job has no Journal line"
area: people
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: lives
model: sonnet
effort: low
root: none
source: added with npm run pool -- add
---

**What.** src/core2/past-work.test.ts fails on clean main (origin/main, Nov 11, 2026) in Ozan, Arkansas (place key 0552940, seed 5c770c3a8e72833a42d0fb4f4b59d487eb02143e1a3c16f5fe21ba480b71ad1f), in the check 'is told in the Journal from its own records': 'past-work:person_3c0e5ff982fdf83d:1: expected 0 to be greater than 0'. The other five checks pass. Replay: GOLDEN_PATH_SEED=<seed> GOLDEN_PATH_PLACE_KEY=0552940 npx vitest run src/core2/past-work.test.ts. Seen: the Journal, where every past job reads as a line.

**Cause.** Found in code: the slot-free line a job with no employer needs is loaded out of the bank. Measured: `GOLDEN_PATH_SEED=5c770c3a8e72833a42d0fb4f4b59d487eb02143e1a3c16f5fe21ba480b71ad1f GOLDEN_PATH_PLACE_KEY=0552940 npx vitest run src/core2/past-work.test.ts` on main 061eda78 fails as the item says. The spell past-work:person_3c0e5ff982fdf83d:1 (1990 to 1992, `end: moved-on`, no `organizationId`) is followed by spell 2, which also has no employer. So its `job-ended:moved-on` moment (`pastWorkMoments`, src/director/journal.ts about line 640) has only `place`, `held` and `wage`, with no `employer` and no `next`. `wordJournalLine` (src/english/journal-words.ts) then finds four lines for the row, every one needing `{employer}` or `{next}`, and returns null; spell 2 fails the same way. The bank holds a fifth line for this case, `journal.work-line-moved-on.i-moved-on-to-another-job` ("I moved on to another job.", added for words-journal-work-line-without-employer, Nov 1), and it is playable. But `mined` in src/english/mined/journal-bank.ts (about line 89) keeps only the lines with a slot whenever a row has any, so the slot-free line is never loaded. The comment there means "said before", and the code means "only". The same failure replays in Brewer, Missouri (2908272, seed 41b07bca68aff6c5e74c65fc5a4a86b34132d2f2b5001e6a9d02b2dfc6f6e4de, spell past-work:person_0936957ca9e25364:1).

**Fix.** Keep the lines without a slot as the fallback, not out. In src/english/mined/journal-bank.ts, let `mined` return every line for the row, named ones first. In `wordJournalLine` (src/english/journal-words.ts), render from the lines that name a slot first, and only when none can be filled, render from the lines with no slot. A line that can name the employer still always does. This is the words engine's code, not the bank: write nothing under data/english/parts. Get the Words session's review (`Review: words`). Check src/director/journal-story.test.ts and src/core2/past-work.test.ts still pass.

**Time box.** 1.5 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Ask why: name the spell's record and what the Journal reader does with it in that played world. Never weaken a test: the check keeps failing when a past job has no line.

**Done when.** A second session replays the test src/core2/past-work.test.ts in Ozan, Arkansas and in Brewer, Missouri with the seeds above, and in two fresh drawn places named with their seeds, and the check 'is told in the Journal from its own records' passes in each. In Ozan the Journal reads a line for spell past-work:person_3c0e5ff982fdf83d:1.

**Waits on.** Nothing.

**Files.** src/english/mined/journal-bank.ts, src/english/journal-words.ts, src/director/journal.ts, src/core2/past-work.test.ts

Nov 11 (cause finder for Fable B): traced in Ozan with temporary logs in the test and in src/director/journal.ts, since undone, and a probe of the loaded words outside the repository. The two first jobs of that person have no employer on record and are followed by jobs with none, so every moved-on line needs a name the record doesn't have. The one line that needs none is dropped when the bank loads. A separate failure in the same file, in Loveland, Oklahoma, is filed as people-past-work-fill-in-no-working-life-loveland.

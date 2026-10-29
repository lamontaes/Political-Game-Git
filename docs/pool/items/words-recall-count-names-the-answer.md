---
id: words-recall-count-names-the-answer
title: "A recall petition's count says how many signed and that the official's answer moved it"
lead: words
milestone: play-first
area: play
kind: wiring
priority: 2
size: S
status: in-pr
claimed-by: words/recall-count-names-the-answer
pr: #6755
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-29T06:34:45.108Z
---

**What.** With recall-reply-moves-the-drive, the recall's due-day count reads the official's answer to the petition's organizer: the recall-outcome record (failed or on-ballot) now carries signatures, required, before (the count without the answer) and answerIds (the scene replies it read). The news and headline banks still say only that a petition got enough signatures or did not ('The petition to recall {name} has enough signatures for a vote.'), so the player never sees the count or why it moved. In Glen Gardner, New Jersey (seed recall-a1 draw 4), the member heard the petitioners out and 21 fewer signed (463 to 442), and nothing on screen says so.

**Rules.** Ask why: the line says why the count moved only from the record's own facts (before, signatures and the answer it read), never a guess. No hand-written player text in code: the words are bank pieces graded like every other.

**Done when.** In a drawn place where the official answered a recall petition, the news line and the journal line for the petition's count name the signatures and, where the answer moved them, that it did, each citing the recall-outcome record id and the reply id, shown by a test on the composed lines and a screenshot.

**Time box.** 2 hours.

**You will see.** After you answer the petitioners, the news of the petition's count says how many signed and that fewer did after you heard them out.

**Screenshot.** The news or journal line for a petition's count after the official's answer, from a drawn place.

**Files.** data/english/parts/news.json, data/english/parts/journal.json, src/director/data/journal-rows.json

**Notes.** Found Oct 28 01:20 by the laws-and-effects lead building recall-reply-moves-the-drive. Oct 29 07:05 UTC, Words and director: the news half is in #6752 (branch words/recall-count-names-the-answer): the count's story says signatures against required and, where the answer lowered it, by how much, citing the reply. The journal half is next on a new branch: the director already gives the member the count's moment (director.json reads the record's memberId), but src/director/data/journal-rows.json has no row for event:recall-outcome, so the journal tells nothing; it needs the row, the drop from before to signatures as a fact, and first-person lines. Oct 29 07:40 UTC, Words and director: the journal half is #6755 (the official's journal tells the count and, where the answer lowered it, by how much, citing the reply). Both test halves pass in Glen Gardner, New Jersey and Seaside, Oregon (run seed 585ea0cdee7ffefa). What is left is the screenshot: the bench has no short path to a recall against the player (hold a seat, pass a divisive bill, draw a petition, answer it), so it needs either that played path scripted in the browser or the owner's call that the composed lines stand in.

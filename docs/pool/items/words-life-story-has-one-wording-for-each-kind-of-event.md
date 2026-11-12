---
id: words-life-story-has-one-wording-for-each-kind-of-event
title: "A life story on the You screen and a person's card is told in more than one way, and names the school and the year"
area: words
kind: bug
priority: 1
size: M
status: merged
standard: 2
claimed-by:
pr: #8783
after: words-first-journal-note-says-the-same-sentence-twice
blocked-on:
lead: words
model: opus
effort: medium
root: rc4-hand-written-words
source: lead's walk of the screens train, Nov 11, 2026 (Summit Park, Utah and Americus, Georgia)
checked:
claimed-at:
branch:
merged-at: 2026-11-11T16:22:42.930Z
---

**What.** "My life" on the You screen and "Her story" on a person's card read as the same list in every world. In Summit Park, Utah: "I started school at Summit Park Public Schools. I went on to middle school. I went on to high school." In Americus, Georgia: "I was out of work in 2006. I worked at Reeves's Market, Sinclair Manufacturing, and Reynolds's Market before Horton Supply Company. I was out of work in 2017." Each kind of event has one sentence, and the school stages name no school and no year. Seen: the You screen's "My life" and the story on any person's card.

**Cause.** Found in code: `tellHistory` in src/bench/card.ts words each history line from the bank data/english/parts/person-history.json, which holds exactly one wording for each kind of event in each form (`person-history.story.school.stage.i`: "I went on to {stage} school."; `.work.out.i`: "I was out of work in {year}."; `.school.started.i`: "I started school at {school}."). A line is given the slots its one wording uses, so the stage line carries only `{stage}`, though `schoolsAttended` gives the school's name and its date. Nothing varies a wording by where it falls in the story or by what the line before it said.

**Fix.**

1. **More than one way to say each kind.** For each story kind in the bank (school started, school stage, work spell, work history, out of work, moved, partner, child, office), at least six wordings in each form (I, a named person, they), joined by the engine's one joiner from a part that says when (the year, or the person's age then) and a core that says what, each core carrying a fact of this life. Keep every piece the owner graded good as one of the cores.
2. **The facts the records hold are passed.** The school stage line gets `school` when that school's record has a name, and `year`. The out-of-work line gets how long when the record holds both ends. The reader for how a job, an employer and an office are said (the one `words-first-journal-note-says-the-same-sentence-twice` adds) words every employer and title.
3. **Two lines in a row never use the same wording,** and a kind that happens twice (out of work in 2006 and in 2017) is told the second time as a second time ("and again in {year}").
4. **The telling stays one function.** `tellHistory` keeps the folding and the order; it asks the English engine for each sentence and builds no text itself. If core-life-record-part-1-the-journal-reads-the-life-list has landed, use its reader; never add a second teller.
5. **Tests, on drawn places:** in ten drawn lives no "My life" holds the same sentence twice; across the ten, each kind of event is said at least three different ways; a school stage with a named school names it. Run tests/guards/english and the card's tests.

**Time box.** 4 hours for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No hand-written player text in code. One engine per mechanic: one teller of a life and one joiner of a sentence. Ask why: each sentence cites its record. One rule, all 56 places. One screen names a thing once, and a thing is said the way people say it (skill `words-engine`, lessons of Nov 11).

**Done when.** A second session, in the running game on main at 1440x900, starts three new lives in drawn places it writes down with their seeds, opens You and reads "My life", then opens two people's cards and reads their story. No story holds the same sentence twice, the three lives do not share a sentence beyond a name, and a school stage names its school where the card's record has one. tests/guards/english passes.

**Waits on.** The reader from words-first-journal-note-says-the-same-sentence-twice.

**Files.** src/bench/card.ts, src/english/journal-words.ts, src/english/english-composition.ts, data/english/parts/person-history.json, data/english/part-grades.json, src/bench/card-history.test.ts (new), tests/guards/english/line-inserts-baseline.json

**Notes.** Found by the lead on Nov 11, 2026. The Journal tells a life from src/director/journal.ts and the card from src/bench/card.ts; making them one teller is the life record's item, not this one.

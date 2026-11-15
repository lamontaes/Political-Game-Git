---
id: words-shared-school-talk-reads-wrong
title: "School talk: wrong years, a tag question answered as a memory, a teacher asked if she remembers her school"
area: words
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by: claude/project-thread-5efbu8
pr:
after: tests-shared-school-give-back-waits-on-a-draw
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: Played talks of #9530 (Nov 15), Dortches, North Carolina, seed 7952d3f3e3253ee4
---

**What.** Three faults in talk about a school both people went to, where the player meets them at a schoolmate's work. (1) A 45-year-old hears "it's been 41 years", the years since kindergarten, not since they were last at school together. (2) "We were at Dortches Public Schools together, weren't we?" is answered "Yes, I do.", a reply written for "Remember …?". (3) Blair, a teacher at the school today, asks "Do you ever think about Dortches Public Schools?" as if it were only the past. Seen: in a talk with a schoolmate, the years the asker says and the replies the player is offered.

**Cause.** Measured: `npx vitest run src/director/shared-school-give-back.test.ts` at #9530, seed 7952d3f3e3253ee4 (Dortches, North Carolina), prints the talks. (1) `sharedHistory` (src/core2/shared-history.ts) keeps only the first school year two shared (`year`, `Math.max(mine.from, peer.from)`), and the shared-school subject (`subjectsBetween`, src/director/conversation.ts) counts its `years` and `long-ago` from it. (2) The tag question shares the move `shared-school-ask-remember` with "Remember X?", and the replies offered after a question are limited by the asking piece's move (`answersTo`, conversation-rules.json), so every "turn" reply follows it. (3) The remember asks need only `long-ago`; nothing reads whether either person works at the school now.

**Fix.** (1) `sharedHistory` keeps `lastYear`, the last school year the two shared; the subject's `years` and `long-ago` count from its end, and two still there together have none. (2) The tag question gets its own move, `shared-school-ask-together`, same text, with `answersTo` plain, brief and years (Words lead, Nov 15). (3) The subject carries `only-past` when neither person's job on record is at that school, and the four remember asks require it; the tag question does not (Words lead, Nov 15).

**Time box.** 2 hours for one Sonnet session at medium effort.

**Rules.** One rule, all 56 places: facts from the school and job records, no place named. No dice: which lines fit is read from records, never a roll.

**Done when.** A second session, on main, runs the school give-back test and plays talks with schoolmates in a played world at seed 7952d3f3e3253ee4, the place it draws from all 56 (Dortches, North Carolina): the years said match the two records' last shared school year, no "Yes, I do." follows "…, weren't we?", and a schoolmate who works at the school asks only the tag question.

**Waits on.** Nothing.

**Files.** src/core2/shared-history.ts; src/director/conversation.ts; src/director/data/conversation-rules.json; data/english/parts/conversation.json

**Notes.** Nov 15: built on claude/project-thread-5efbu8 under Review: words.
Built: `sharedHistory` keeps `lastYear`; the subject's `years` and `long-ago` count from the end of that school year, and two still enrolled together have neither. The tag question has its own move `shared-school-ask-together`, and `answersTo` limits its replies to plain, brief and years. The four remember asks require `only-past`, which the subject has only once both have left the school and neither works there. "Thanks again." (`conversation.farewell-core.thanks-again`) is deleted from the bank, on the Words lead's yes: no close knows that a thanks came earlier. At Dortches, Blair (a teacher at the school) now asks the tag question, and every years figure matches the last school year the two shared (28, 31, 36). The test checks two still enrolled there (Michael and Bryan) have no years. Seen red with the old count: 37 against 28, and a years fact for the enrolled pair.

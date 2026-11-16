---
id: words-shared-school-talk-reads-wrong
title: "School talk: wrong years, schoolmates who never shared a building, a tag question answered as a memory, a teacher asked if she remembers her school"
area: words
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/project-thread-5efbu8
pr: 9546
after: tests-shared-school-give-back-waits-on-a-draw
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: Played talks of #9530 (Nov 15), Dortches, North Carolina, seed 7952d3f3e3253ee4
---

**What.** Four faults in talk about a school both people went to, where the player meets them at a schoolmate's work. (1) A 45-year-old hears "it's been 41 years", the years since kindergarten, not since they were last at school together. (2) "We were at Dortches Public Schools together, weren't we?" is answered "Yes, I do.", a reply written for "Remember …?". (3) Kimberly, in the district's high school while the player was in its elementary school, asks "Remember Dortches Public Schools?". (4) Blair, a teacher at the school today, asks "Do you ever think about Dortches Public Schools?" as if it were only the past. Seen: in a talk with a schoolmate, the years the asker says and the replies the player is offered.

**Cause.** Measured: `npx vitest run src/director/shared-school-give-back.test.ts` at #9530, seed 7952d3f3e3253ee4 (Dortches, North Carolina), prints the talks. (1) `sharedHistory` (src/core2/shared-history.ts) keeps only the first school year two shared (`year`, `Math.max(mine.from, peer.from)`), and the shared-school subject (`subjectsBetween`, src/director/conversation.ts) counts its `years` and `long-ago` from it. (2) The tag question shares the move `shared-school-ask-remember` with "Remember X?", and the replies offered after a question are limited by the asking piece's move (`answersTo`, conversation-rules.json), so every "turn" reply follows it. (3) `sharedHistory` counts two people as schoolmates when any of their runs at the same district overlap, whatever the stage; a district's elementary, middle and high schools are one organization. (4) The remember asks need only `long-ago`; nothing reads whether either person works at the school now.

**Fix.** (1) `sharedHistory` keeps `lastYear`, the last school year the two shared; the subject's `years` and `long-ago` count from its end, and two still there together have none. (2) The tag question gets its own move, `shared-school-ask-together`, same text, with `answersTo` plain, brief and years (Words lead, Nov 15). (3) Together means one stage of the school in the same years: each school run carries its stage (`schoolSpans`, src/core2/past-school.ts), and `sharedHistory` matches runs at the same stage, and for two enrolled now their stages this year (Account lead, Nov 15). (4) The subject carries `only-past` when neither person's job on record is at that school, and the four remember asks require it; the tag question does not (Words lead, Nov 15).

**Time box.** 2 hours for one Sonnet session at medium effort.

**Rules.** One rule, all 56 places: facts from the school and job records, no place named. No dice: which lines fit is read from records, never a roll.

**Done when.** A second session, on main, runs the school give-back test and plays talks with schoolmates in a played world at seed 7952d3f3e3253ee4, the place it draws from all 56 (Dortches, North Carolina): the years said match the two records' last shared school year, no "Yes, I do." follows "…, weren't we?", no two people at different stages of the school are called schoolmates, and a schoolmate who works at the school asks only the tag question.

**Waits on.** Nothing.

**Files.** src/core2/shared-history.ts; src/core2/past-school.ts; src/director/conversation.ts; src/director/data/conversation-rules.json; data/english/parts/conversation.json

**Notes.** Nov 15: built on claude/project-thread-5efbu8 under Review: words.
Built: `sharedHistory` keeps `lastYear`; the subject's `years` and `long-ago` count from the end of that school year, and two still enrolled together have neither. The tag question has its own move `shared-school-ask-together`, and `answersTo` limits its replies to plain, brief and years. The four remember asks require `only-past`, which the subject has only once both have left the school and neither works there. "Thanks again." (`conversation.farewell-core.thanks-again`) is deleted from the bank, on the Words lead's yes: no close knows that a thanks came earlier. At Dortches, Blair (a teacher at the school) now asks the tag question, and every years figure matches the last school year the two shared (28, 31, 36). The test checks two still enrolled there (Michael and Bryan) have no years. Seen red with the old count: 37 against 28, and a years fact for the enrolled pair. Later on Nov 15, on the Account lead's ruling: schoolmates now need the same stage. Kimberly (high school 1985-88) is no longer the player's schoolmate; Blair's last year with the player is 1989-90 (elementary), so 35 years. The test checks Kimberly and the player by name (red without the stage match), and the still-enrolled pair is now Michael and Joseph, both in middle school.

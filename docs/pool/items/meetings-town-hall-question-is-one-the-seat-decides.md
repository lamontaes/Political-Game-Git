---
id: meetings-town-hall-question-is-one-the-seat-decides
title: "A town hall's residents ask what the host's seat can decide, not the question they feel most about anything"
area: core
kind: bug
priority: 2
size: S
status: merged
standard: 2
claimed-by:
pr: 9419
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: filed by hand by the meetings and floor builder from the owner's rule 99 and the Words lead's rules 115 and 116, Nov 15 2026
checked: meetings and floor builder 2026-11-15
---

**What.** At a town board's town hall the resident's question was one the board cannot decide, such as right-to-work rules, and it was the same in every town. The player was told to answer for a law no board of theirs writes, and the scene's follow-up lines had nothing local to lean on. Seen: Delta City, Mississippi, Roy, Montana and Klamath Falls, Oregon (seeds meet-a1:0 to :2) all heard right-to-work rules on every hall.

**Cause.** Found in code: `townHallDrives` in src/core2/modules/meetings.ts picked each resident's question as the most strongly felt of every policy question in the game, with no filter for what the host's seat decides; the debate's chooser (`debateQuestions`) already puts what the seat decides first through `contestPositions`, owner rule 99.

**Fix.** `townHallDrives` takes the host's seat (the offices of their serving terms, or the office their forum is held for) and picks each resident's question from `contestPositions` for that office; who comes is unchanged, so the take-part calibration holds (the same seeds read the same odds before and after). A host with no seat keeps the old pick.

**Time box.** 4 hours.

**Rules.** No dice; one rule for every place; one engine per mechanic (the debate's own positions, not a copy); no new stopgaps.

**Done when.** A second session plays a town hall at a drawn place and the question the resident asks is one the host's seat decides (a local budget line or a question the body takes up), naming the place and seed, in a played world with the room the same size as before.

**Waits on.** Nothing.

**Files.** src/core2/modules/meetings.ts, src/core2/town-hall-question-seat.test.ts

**Notes.** Roy, Montana (meet-a1:1): the question became "more spending on land and water". The first version narrowed the room as well as the question and moved Mondak's calibration (pooled take-part odds 3.78 to -0.27 on a fixed seed, rooms filled down a third); the final one leaves the room alone and matches the base exactly on seeds a1b2c3d4e5f60718293a4b5c6d7e8f9012345678 and 0f1e2d3c4b5a69788796a5b4c3d2e1f001122334 (the second reads 2.556 on both, red by draw on the base too). The lines the resident then says are the Words lead's (rules 115, 116: "a date" with nothing named) and ride on the town hall stop PR.

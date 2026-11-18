---
id: director-address-points-read-the-plan
title: "The housemate's address point reads the outline's plan, not only the sentences"
area: director
kind: bug
priority: 1
size: S
status: claimed
standard: 2
claimed-by: claude/story-address-points-from-record
pr:
after:
blocked-on:
lead: story
model: fable
effort: medium
root: none
source: Story, Nov 18, the first report on the opening evening at home (#9750): in seven drawn worlds no housemate raised a point of the address they watched together
checked:
---

**What.** On the first evening a housemate who watched the President's address with the player raises one point of it and where they stand (owner, Nov 11). In seven drawn worlds none did: `addressPoints` found no point in the address, though the outline had planned one, so the talk opened on nothing.
Seen: the opening evening at Raysal WV (seed home-evening:0), Aubrey TX, Pemberton MN, Pascoag RI: every housemate unclickable.

**Cause.** Found in code: `addressPoints` in `src/director/opening-facts.ts` rebuilt each point from the address's sentences alone and kept a policy point only when a sentence carried its noun phrase, verb phrase and stance. An address that asks to be held to a question ("You know what I'm asking for on forgiving student loans, so hold me to it.") names the question in its record ids but states no stance in that sentence, so the point was dropped, while the outline's own record of the point (`opening.points`, the planner's side) held it the whole time. A view computed its own version of a fact the record already kept.

**Fix.** `addressPoints` reads the outline's planned points for every question a sentence names and fills what the sentence left out: the President's side from the plan, the noun and verb phrases from the question's names. A planned point no sentence names stays out (it was never said aloud). Unit test `src/director/opening-facts.test.ts`.

**Time box.** 2 hours.

**Rules.** The simulation is the one layer that knows; every view reads the same record (owner, Oct 28). No dice. One engine per mechanic: the talk reads the opening's record, no second store.

**Done when.** A second session, in a drawn place with a housemate of 16 or more on main, clicks the housemate on the opening evening and the housemate raises the President's point with a stand; the dev-mode Trace names the opening record and the plan's point. On the cut (#10063) the same talk opens as soon as its lines are written again.

**Waits on.** Nothing.

**Files.** src/director/opening-facts.ts, src/director/opening-facts.test.ts

**Notes.** Nov 18 (Story): on the train the Raysal housemate now opens with "The President came out against forgiving student loans. I'm glad. Does that sound right to you?" and two replies; the words are the train's, and the cut's rebuild of these lines is a separate first report (#9750).

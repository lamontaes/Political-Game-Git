---
id: words-counter-two-people-in-one-state-office
title: "A state's counter names two people in one office"
area: director
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: opus
effort: medium
root: design-words-machine
source: S4, Nov 14, from the second words reader's read of PR 9173's played lines
---

**What.** At the filing counter of one drawn world, the clerk for the U.S. representative race is said as the Ohio Secretary of State (a person who heads an agency of that name), and the clerk for the president race is said as the Secretary of State (an elected or appointed holder): two different people in one office in one world. Seen: at the filing counter of any state or federal race, in the narration the player reads.

**Cause.** Needs cause. Measured: Parma, Ohio (place key 3961000, seed s4p:2): Kenneth Saunders is the clerk at the counter for U.S. representative with heads "Ohio Secretary of State" (the election chief fallback in src/core2/modules/filing-clerk.ts), and Brenda Walter is the clerk at the counter for president with the title "Secretary of State" (the seat holder path). One of the two contests' filing rows names the office differently, or the president's counter reads the wrong office; the code names stateClerkFor and stateElectionChief as the two paths.

**Fix.** None until the cause is found.

**Time box.** 2 hours, Opus medium.

**Rules.** One rule for all 56 places; the person is said from the record, never from a typed list.

**Done when.** In a drawn place (named with its seed) every state and federal counter of one state is held by one person for one office, or the world names why not; a second session files in that place for a federal race and for president and sees the same clerk.

**Waits on.** Nothing.

**Files.** src/core2/modules/filing-clerk.ts, src/core2/filing-clerk-post.test.ts (new)

**Notes.** Filed by S4 after PR 9197.

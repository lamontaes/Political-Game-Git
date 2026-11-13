---
id: words-filing-counter-greets-a-filed-player-as-new
title: 'A filed candidate back at the counter is asked "Here to file?" and offered the race they already filed in, with no way to hand in the petition'
area: words
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: Words builder W3
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: Playtester P1, Nov 13 (cause and fix read by Words builder W3)
claimed-at:
---

**What.** Commack, New York (creator life, age 29, bench seed 84f2626c-06e2-4b64-95cc-ab59382b866b, main 5e68cde1). On Feb 4, 2025 the player files for the Smithtown Town Board at the county board of elections: "That's it. Your name's in for the board in Commack." with SIGNATURES THE CLERK WILL COUNT: 500, HANDED IN BY APRIL 3, 2025. On Feb 18 they come back. The narration says "you take your petition back to the City Clerk's office. Sarah Sandoval holds out a hand for it." The clerk says "Hello. I'm Sarah Sandoval. I keep the candidate list for Commack. Here to file?" and offers only "I want to run for the Smithtown Town Board." Then: "Okay then. Another one for the board. … It all has to be back to me by April 3." The only reply left is "Then running for the board will have to wait."
Seen: the filing counter on a filed candidate's return visit.

**Cause.** Found in code: src/bench/filing.ts `openBenchFilingVisit` lists every open contest the player may file for, and nothing leaves out the one their own filing is already in. The clerk's greeting is the first-visit greeting whatever `filedHere` says (read by W3, Nov 13).

**Fix.** Leave out a contest the player's filing is already in. When the only thing left is the petition, the clerk's scene says where it stands, from `petitionView` (signatures counted so far, the day it is due), and the player can ask or leave. With nothing left to file and no petition, the counter scene is not played (rule 19). Stack it on #9029's counter scene.

**Time box.** 2 hours for one Sonnet session.

**Rules.** No hand-written player text: the petition lines come from the bank, through the counter scene. One rule, all 56 places: the visit reads the player's own filing record, with no place named.

**Done when.** A second session, on main, starts a new life in a drawn place, files where a petition is required, comes back to the counter a week later, and takes a screenshot. The clerk does not offer the race again and says how many signatures are counted and when they are due. A player with nothing to file and no petition is not given the counter scene.

**Waits on.** #9029 (the counter scene names the clerk's office from the filing record).

**Files.** src/bench/filing.ts, src/bench/campaign.ts, src/director/filing-visit.ts

**Notes.**

- Nov 13, Words builder W3: built on `claude/words-w3-counter-return`, stacked on #9029. What changed:
  - The filed race is left out at the counter.
  - With only the petition left, the clerk says where it stands, and Leave is the one reply.
  - With nothing left, `/api/filing/open` answers `{nothing: true}` and no scene plays.
  - With other races left, the narration is a first visit's.
- Also on this branch:
  - P1's Richburg rule-8 fix: one said name per filing office, read by the counter and by Travel.
  - Fable A's 08:21Z ruling: the clerk tells no petition for a race that takes no signatures. The screen's line is #9039's.

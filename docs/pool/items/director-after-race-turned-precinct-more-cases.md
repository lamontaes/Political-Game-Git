---
id: director-after-race-turned-precinct-more-cases
title: "Race night and the morning after say the precinct that turned for the player, in a win, and the player's own precinct"
area: director
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: director-after-race-turned-precinct (#9446), the Account lead's call Nov 15 that only sentences that played ship
---

**What.** The precinct that turned, said on race night and the morning after. #9446 saves the votes by precinct and ships no line, because the first two sentences ("We lost Precinct N.", "It was ours last time.") say the precinct was won before and none of seven drawn places (Bountiful UT, Stoneham MA, Marengo IL, Wabaunsee KS, Meadville MO, and two with no office counted twice) had a player who led a precinct. All sixteen sentences the Words lead wrote (those two; the swing for the player after a loss "Precinct N came over to you." / "It wasn't enough."; a win with a swing for "It was Precinct N." / "It wasn't ours last time." or against "We won. But we lost Precinct N."; the morning wordings "I keep thinking about Precinct N.", "Precinct N came over.", "Remember that next time."; and the player's own precinct "We lost your own precinct.", "Your own precinct came over to you.", "It was your own precinct.", "We won. But we lost your own precinct.", "I keep thinking about your own precinct.", "Your own precinct came over.") wait for a played case. Seen: in the race-lost and victory-night scenes on race night and the morning after.

**Cause.** Found in code: src/director/race-turnout-facts.ts and every other reader of the voting results read no `precinctTotals` yet (src/core2/modules/voting.ts only keeps it). A fact must say what the records show: "ours last time" needs the same candidate to have led the precinct (most votes of any candidate there) in the earlier count for the same office and not lead it in this one, with both counts cut into the same precincts; the first version of the fact (the precinct whose share moved most) named precincts the player never led.

**Fix.** Add a fact for each case the records can show true, read from `precinctTotals` of this count and the earlier count for the office (same candidate, same precinct cut), cited by result id, and `stateMoves` for the arc that says it. Each sentence from /mnt/project-files/words-lead/after-the-race/turned-precinct-lines.md ships only after a played run at the final head shows the case and both counts' precinct votes beside the line. A world where the player leads a precinct and then loses needs finding: the player filing in the first seat never led in the places tried, so try a place with few candidates or a player who ran and won first. The played script is in git history at commit 0c98839a on branch claude/project-thread-p37c46.

**To record when it is built.** In five towns (Bountiful UT, Stoneham MA, Marengo IL, Wabaunsee KS, Meadville MO) the player never led a precinct in either election. Seen so far: Bountiful precinct 5, 162 of 1,217 votes in 2025 (fourth), 59 of about 770 in 2027; Stoneham precinct 4, 98 of 706 in 2025 (fourth of four), 111 of 1,100 in 2027. For every played race print the player's share overall, their rank, and the precinct they did best in with its rank there. If a played candidate almost never carries a precinct, "It was ours last time." has no case to find and the question becomes why (how a player's votes spread over precincts), not which place to draw.

**Time box.** 4 hours, most of it played runs (about 20 minutes each).

**Rules.** No count spoken. A sentence ships only if it played at the final head and the records show it true.

**Done when.** A second session sees each added sentence played at its exact head in the played file, naming the place, the seed and both counts.

**Waits on.** Built on the #9446 branch and folds together with it, because the saved split has no reader until this lands (a fact no line reads does not ship; Account lead, Nov 15). The morning lines wait on world-race-lost-day-after-keeps-night-narration.

**Files.** src/director/race-turnout-facts.ts, src/director/data/purpose-arcs.json, data/english/parts/scene-talk.json

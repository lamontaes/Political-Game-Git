---
id: director-race-told-to-the-candidate-after-the-returns
title: 'The day after watching their own returns, the candidate is told "You won''t like this. Jeffrey Fernandez won" as if it were news'
area: director
kind: bug
priority: 2
size: S
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
source: Playtester P1, Nov 13
claimed-at:
---

**What.** Richburg, South Carolina (bench seed a8ad5c79-cb5b-4616-b711-61b16eca1a9d, main 5e68cde1). The player ran for Town Council and watched the returns on Wednesday, November 5, 2025: "Every place is in. Jeffrey Fernandez wins the race for Council member. It wasn't enough. Jeffrey Fernandez won." The next morning: "Charles Strong knows you were on the ballot in the council member race. They have the result, and they came to tell you." / "Wyatt, I need to tell you something. You won't like this. Jeffrey Fernandez won the council member race." The player is told, as news, a result they watched called the night before. Once Week stops on election night (play-week-runs-past-election-night, #9027), every candidate sees the returns, so this talk always repeats them.
Seen: the street talk the day after the count, for a player who ran in the race.

**Cause.** Found in code: src/director/data/circumstances.json, row `race-result-known` (`recordKinds: election-result`, `afterDays: 1`, `player: "anyone"`). Its words are written for a teller who "came to tell you", but the player rule lets it call a player who ran in the race and saw the count that night (src/director/circumstance.ts `playerHolds`).

**Fix.** Give `race-result-known` a player rule that leaves out a player who ran in the contest or voted in it, since both are shown that night's returns. Keep it for a player who neither ran nor voted, who has not heard. The candidate's own day after stays with the rows written for it (`morning-after`, the volunteers' visit). Add the case to src/director/circumstance.test.ts: a candidate's `race-told` scene never cites their own contest's result.

**Time box.** 2 hours for one Sonnet session.

**Rules.** scene-standard: a scene exists only if it writes something back; telling someone what they already saw writes nothing. One rule, all 56 places: the player rule reads the contest and ballot records, with no place named.

**Done when.** A second session, on main, plays a new life in a drawn place to a race the player runs in, watches the returns, and takes a screenshot of every scene the following week. None tells the player who won their own race as news. A resident who did not vote is still told by someone they know.

**Waits on.** play-week-runs-past-election-night (#9027), which makes every candidate see the returns.

**Files.** src/director/data/circumstances.json, src/director/circumstance.ts, src/director/circumstance.test.ts

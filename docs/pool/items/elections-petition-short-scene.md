---
id: elections-petition-short-scene
title: "A filed player whose petition is behind is told so, and decides whether to go out for names"
area: elections
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by: claude/project-thread-p37c46
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: Account lead, Nov 15 12:18Z: the home-talk-own-race-only red at Sherrodsville OH 3972242, seed scan-25, after the fold of #9473; the first fix (#9492) worked the player's petition between pauses and is withdrawn against OWNER-DECISIONS Oct 14
---

**What.** A filed player whose petition is behind had no one to tell them: nobody worked it unless a volunteer happened to join, and the clerk marked it short at the deadline. The campaigns engine now writes one petition-short record per filing, on the last turn on which a canvass shift a day can still close the gap, and the director stages it as a scene: the helper on the campaign staff or volunteers who has been watching the sheets (measured against what the campaign aims to gather), else the clerk who took the filing (measured against the count the office requires), tells them. A yes takes their canvass day (the Campaign tab's own choice); a no changes nothing. Seen: at Sherrodsville OH the clerk tells the player three days before the deadline with nothing signed, and a yes puts 15 names on the petition and the player on the ballot.

**Cause.** Found in code: src/core2/modules/campaigns.ts, the daily race loop runs `volunteerShifts` and `circulatorShift` for every filing but `campaignTurn` only for world candidates, so the player's petition is worked only by their own hand or a volunteer. Before the fold of #9473 one volunteer walked 41 doors; after it the volunteer's lean fell on the other side of the line and the petition stayed at 0 (src/director/home-talk-own-race-only.test.ts, Sherrodsville). OWNER-DECISIONS Oct 14 ("No engine accepts a job, a home, a filing or any choice for the controlled person; the engine offers, the player decides") rules out the engine working it for them.

**Fix.** `petitionShortReading` (the gap to the count the office requires for the clerk, to `signaturesToGather` for a helper, against the days left after the next turn, at one `petitionShiftYield` a day: `playerCanvassHours` x `doorsPerCanvasserHour` x `petitionSignOpenness`, no number of its own), `petitionTeller`, `tellPetitionShort` and `answerPetitionShort` in campaigns.ts; the situation type, purpose arc, facts block and dev-mode control (Calendar, Campaign set-up, "Petition falls behind") in the director and bench; the Words lead's lines placed as written.

**Time box.** 6 hours.

**Rules.** Owner Oct 14 (the engine offers, the player decides) and OD:982 (a decision that comes up when it matters, once, never a daily list). No dice: the trigger is the filing's own arithmetic. No figure, count or date in any line (owner). Sliding scale: the gap slides with the days left. Dev mode triggers it through the game's own clock and traces who told, the day and the arithmetic.

**Done when.** A second session, on main at a drawn place, runs src/director/petition-short.test.ts and src/director/home-talk-own-race-only.test.ts and both pass, then plays Sherrodsville OH (3972242, seed scan-3) through dev mode's "Petition falls behind": the clerk's scene shows, a yes puts the player on the ballot, and a petition filled by hand is never told.

**Waits on.** The Words lead's lines (placed as written) and a second reader's stamp at the exact head.

**Files.** src/core2/modules/campaigns.ts, src/director/purpose-scene.ts, src/director/data/situation-types.json, src/director/data/purpose-arcs.json, src/bench/dev-mode.ts, src/director/petition-short.test.ts

**Notes.** The helper's scene is reached by play: at Sherrodsville (scan-7) a household member (the player's son) offer to run the campaign comes on June 8 (the game's manager-offer scene), the player's yes puts them on the staff, and on Aug 3 they tell the player the petition is behind with nothing signed. Evidence that the case happens in ordinary play, from the gov-party thread's twelve fixed draws (seeds jpr-pin:0 to 11; the Account lead's count, not re-run here): five new players who filed and did no campaigning came up short on signatures (Newry SC, Washington DC, Ashaway RI, Kappa IL, Kingston RI). Own PR on the Train head, thread "Build scenes after the race". Limits listed: where the records name neither a helper nor a clerk (a state or federal filing with no one on the campaign) no scene stages and the Campaign tab shows the count. A player on own-choice has the scene acknowledged, not answered: the character decides nothing. Related: tests-filing-fixed-date-thirteen-files (the drawn loop in campaign-door-balance.test.ts failed on one tree and passed on the base). Re-pinned Nov 15 after Train 29ef4685: at scan-25 a volunteer now fills the player's petition on their own (15 of 10 by Aug 7; bisected to the Train's fold of #9539, d1f9f3bf, the colleagues-company closeness change, between 83ed301f and 058294ec), so the clerk cases moved to scan-3 and its siblings, found by a probe script outside the test (seeds scan-1 to scan-32, clerk and helper play each, about 50 minutes on two processes; passed over seeds where the petition filled unprompted or nobody was short). A helper told the player only if the player knows them by name (scan-4's household helper had no name the scene could say). Scan-25 is now the pinned on-pace world: the petition fills by play with nothing written by the test. After the Train's ef708196 a volunteer also fills the petition at scan-12, so it left the clerk seeds. Scan-60 joined the clerk worlds because only there (a probe over scan-26 to scan-61, one entrant each) do the clerk's "There aren't enough names here for {office}" and both "Alright." answers play; which sibling plays follows the speaker's own traits.

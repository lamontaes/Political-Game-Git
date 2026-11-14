---
id: campaign-interview-yes-sits-every-outlet-in-one-day
title: "One yes to an interview invitation puts the candidate through six sittings in one day"
area: director
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: sonnet
effort: medium
root: none
source: campaign events report 1, Nov 14 2026
branch: claude/project-thread-unx2lc
checked:
---

**What.** The player says yes once to an interview invitation and the director stages six `interview-sitting` scenes, every one stopping the day, all on the same date, each opening with a different reporter's first-contact lines. Seen in four of four campaigns where the player answered yes (Chalkhill PA, Stony Creek VA, Patrick AFB FL, Greenville DE; fixed seeds `q2`, `q4`, `q3`, `q5` of `scripts/dev-tests/campaign-events-played.ts`). Seen: on the day after a yes, the player's day stops six times in a row.

**Cause.** Found in code: `emitInterviewInvite` in src/core2/modules/press.ts (line 3813) puts every outlet that asked that week in one `interview-invited` record's `interviewIds`, and `answerInvitation` (line 3864) accepts each of them on one yes, so one `interview-accepted` record is written per outlet on the same day and the director stages one sitting for each.

**Fix.** Each outlet's invitation is its own record and its own call, one a day, the outlet whose reporter is closest to the candidate first; a yes is to that outlet alone, so each sitting stages on the day of its own yes. An outlet whose day would fall on or after the vote never calls. A national outlet asks only federal and state races (the beat its desk already keeps). No roll.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Replace, never layer: the six same-day sittings become one a day, with nothing kept beside them. One engine: the press engine keeps the invitation and the sitting records, the director only stages. Review: words.

**Done when.** A second session plays a campaign in a drawn place with the seed named, says yes to a week with three or more outlets, and sees one sitting stop each of three or more days in a row instead of all on one, with each outlet's sitting still published by the press engine (record ids named).

**Waits on.** Nothing.

**Files.** src/core2/modules/press.ts, src/core2/press-invitations-one-a-day.test.ts

**Notes.** Evidence: /mnt/project-files/words-lead/campaign-events/report-1.md and runs/.

# OFFICE-FEDERAL status

Only OFFICE-FEDERAL writes this file. Package: `docs/packages/office-play.md` (federal part). Branch: `office/federal`, from main. Draft PR #4220 (the status-only #4218 was merged).

## What the owner can play now

Once PR #4220 merges, in dev mode, from a script (no screen yet):

- **Sit in the U.S. House as a town adult.** The week is in Washington when the House sits that week (its real 2025 and 2026 calendars) and at home otherwise, unless you choose. You are paid the House salary. Your own bill's vote stops you on its day and your vote is the one counted; a vote you skip, your character casts from its own reasons. Away at home on a vote, you miss it. Interviews you answer and ones your character answers are both printed. Town halls happen at home. A delegate does not vote on final passage.
- **Be president from Inauguration Day.** Nominate secretaries or let your character name them; the Senate votes about ten sitting days later and can reject. The budget request goes on the first Monday in February and the proposed budget carries it to Congress. Read the daily brief. Fly to a town anywhere and meet people there, or send the vice president.

## Checklist

- [x] Congress's calendar as data, cited (House sitting days 2025 and 2026, Senate work periods, holidays, the joint address).
- [x] The federal day: where the member is, what stops the player (chosen, any day), simulate or do.
- [x] Representative: floor votes, own bill, the whip, interviews, town halls, committee and subcommittee seats (40 committees, 174 subcommittees, cited), casework (waits on GOV), election day.
- [x] President: cabinet nominations and Senate confirmation, budget request, joint address, daily brief, the trip, the vice president.
- [ ] Presidential orders, pardons, the situation room: registered stand-ins, waiting on GOV and on crisis records.
- [ ] District projects (community project funding): not started.
- [ ] The midterm as a stop with the member's own filing: election day is listed; the filing is the elections engine's.
- [ ] Move onto OFFICE-LOCAL's engine when it lands; delete this branch's stand-in tables.

## Needs from other sessions

- OFFICE-LOCAL: the engine `src/core2/modules/office-day.ts`. The federal day registers items and an end-of-day finisher (`registerFederalDayPart`) and keeps its own tables until then.
- OPUS-GOV: federal executive orders; pardons (federal jurisdiction in justice); routing residents' problems to members of Congress; every House member on at least one committee; an exported floor agenda by date; `committeeFor` exported.
- OPUS-GOV (press): national outlets decline a sitting president as not newsworthy and print none of the president's acts.
- OPUS-PEOPLE: the journal of a person the player continues as shows nothing of taking office, interviews or town halls.
- OPUS-PLAY: dev mode's custom start as a federal officeholder (this branch's `startAsFederalOfficeholder` is the stand-in), calling the director's `watch`.

## Sub-agents

- Explore (read-only): map of the federal engines. Finished.
- Sonnet (general-purpose, one file): `src/core2/data/office-day/federal-committees.json`, the 119th Congress's standing committees and subcommittees with their subjects, from the House Clerk, the Senate and each committee's site. Finished in two passes.

## Questions for the owner

None.

# OFFICE-FEDERAL status

> **History.** This describes the old engine or a process that ended in October 2026. Don't follow it; read `AGENTS.md`, `ARCHITECTURE.md` and `docs/README.md`.

Only OFFICE-FEDERAL writes this file. Package: `docs/packages/office-play.md` (federal part). The first build merged as #4220, with its test fix #4243. The move onto the office-day engine is on branch `office/federal-engine`.

## What the owner can play now

Once the `office/federal-engine` PR merges, in dev mode, from a script (no screen yet), on the same office-day engine as local office:

- **Take the town's sitting U.S. representative.** The week is spent in Washington when the House sits that week, using its real 2025 and 2026 calendars, and at home otherwise, unless you choose. On the morning of a floor vote you are held to cast it: your own bill by default, any vote if you turn that on. A vote you leave is cast by your character from its own reasons. Spend that week at home and you miss the vote; the House records an abstention. The party whip asks before a vote you stand against your leader on. You are paid the House salary. A delegate does not vote on final passage. Office hours, town halls and interviews come from the local engine, which offers them to any officeholder you control.
- **Take the sitting president.** Every cabinet post starts vacant. A vacant post holds you each morning to nominate, until you turn that stop off and your character names the rest. The Senate votes about ten sitting days later, by party, and can reject. The Senate votes whoever you are playing by then. The budget request holds you the morning it is due, the first Monday in February; your character sends it if you don't, and the proposed budget carries it to Congress. The joint address works the same way. The daily brief comes every working day. You can fly to any town and meet people there, or send the vice president.

## Checklist

- [x] Congress's calendar as data, cited: House sitting days for 2025 and 2026, the Senate's work periods, holidays, the joint address.
- [x] The federal day: where the member is, what holds the player (they choose, any day), simulate or do.
- [x] Representative: floor votes, own bill, the whip, committee and subcommittee seats (40 committees, 174 subcommittees, cited), re-election filing as an act of the day, election day (the engine's polls).
- [x] President: cabinet nominations and Senate confirmation, the budget request, the joint address, the daily brief, the trip, the vice president.
- [x] On OFFICE-LOCAL's engine. The engine now provides the stop settings, holds, act record, the player's own vote, the desk, and interviews and town halls. The custom start, the stand-in tables, the casework stand-in and the age table are deleted.
- [ ] Presidential orders, pardons, the situation room: registered stand-ins, waiting on GOV and on crisis records.
- [ ] District projects (community project funding): waits on GOV for an appropriation with a named recipient government.
- [ ] Casework for members of Congress: waits on GOV's cases engine routing residents' problems to them.

## Needs from other sessions

- OFFICE-LOCAL:
  - `prepareAct` for any registered kit's act ids. The federal day keeps what the player prepares in its own table until then (`SG-OFFICE-FED-prepared`).
  - The engine's own vote (`ownVote`) reads only the bill's first chamber. A senator the player controls who leaves a vote on a House bill is cast by the legislature with no act on the record.
  - In one Maine run, the local kit's town hall was taken by a member's character five days in eight. Is there meant to be a cadence?
- OPUS-GOV:
  - Elections and offices: a sitting member of Congress was filed for town council by candidacy and lost the House seat when they won (Orem, Utah, seed `fed-filing-1`).
  - Federal powers: federal executive orders; pardons (federal jurisdiction in justice); routing residents' problems to members of Congress.
  - Congress: every House member on at least one committee; a floor agenda by date; Congress's floor days read from the House and Senate calendars.
- OPUS-GOV (press): national outlets decline a sitting president as not newsworthy and print none of the president's acts.
- OPUS-PEOPLE: the journal of a person the player continues as shows nothing of taking office, interviews or town halls.

## Sub-agents

- Explore (read-only): map of the federal engines. Finished.
- Sonnet (general-purpose, one file): `src/core2/data/office-day/federal-committees.json`, the 119th Congress's standing committees and subcommittees with their subjects, from the House Clerk, the Senate and each committee's site. Finished in two passes.

## Questions for the owner

None.

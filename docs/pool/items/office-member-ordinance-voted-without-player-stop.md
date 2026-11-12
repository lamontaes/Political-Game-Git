---
id: office-member-ordinance-voted-without-player-stop
title: "A seated player is held at the meeting where their board votes, and nothing is filed in their name without them"
area: office
kind: bug
priority: 1
size: M
status: merged
standard: 2
claimed-by: claude/pool-office-member-ordinance-voted-without-player-stop
pr: #8807
after:
blocked-on:
lead: governing
model: opus
effort: high
root: rc7-player-cannot-drive
source: Fable B's play of the bench, Nov 11, 2026 (Advanced start as a county commissioner); cause found by a Fable B helper the same day
claimed-at: 2026-11-11T13:46:45.820Z
merged-at: 2026-11-11T15:26:28.995Z
---

**What.** A player seated on a three-member county board presses Day through the board's regular meeting and is never stopped. Afterward the board shows a "Budget Ordinance" passed 2 to 0 on the meeting day, the journal says the player introduced it, and the player's own roll-call row says yes, all without a single act by the player. The meeting must hold the player when their seat votes, a bill must not name the player as its sponsor unless the player filed it, and the player's row must come from the player. Seen: the meeting screen opens at the board's meeting hour, and the journal's "I introduced" line appears only after the player files a bill.

**Cause.** Found in code: three faults in the same path, reproduced on main 97b13d4368 with bench seed 253225ee-ffc1-449c-b180-ec52013de651, playing Holly McGee (person_58dc6cdc4dd0560d), District 1 seat on the Wahkiakum County board (office:gus2025:140688:board, three seats), Washington, Day pressed 24 times from Jan 20, 2025.

1. The bill never reaches the agenda. `localMeeting` in src/core2/modules/world-legislating.ts (line 1961) holds members' filings for the player only when `meetingHold` says so, and `scheduleMeeting` (line 2093) decides whether to file on the eve once, when the meeting is put on the calendar. In Advanced start that is at the world's opening, before the player takes the seat (`BenchPlayer.select` comes after `buildBenchWorld`), so `holdsMemberFilings` (src/core2/modules/office-day.ts, line 676) reads another person in control and returns false. The board's Feb 4 sitting therefore files on the day, with no `holdFor`, and `holdSession` (world-legislating.ts, line 876) calls `holdVote` at once. The meeting row stays `agenda: []`, `playerPresent: false`, and the session row `local-meeting:office:gus2025:140688:board:2025-02-04` records bill 2025-1 (`budget-line:welfareAndMedicaid`, a cut) as voted.
2. Even when filings are held, the stop is decided too early. `postAgenda` (office-day.ts, line 404) runs on the notice day, `agendaNoticeDays` = 3 days before the meeting (src/core2/data/office-day/parameters.json). It sets `playerPresent` from the agenda as it stands then. Members file on the eve (world-legislating.ts, line 2092), and `placeFiled` (office-day.ts, line 688) appends their bills to the posted row without checking the stop again. So the default `own-bill-vote` stop (office-day.ts, line 91) can never fire for a bill a member files, and no stop kind covers "a vote where yours could decide it". src/core2/office-day-member-filings.test.ts passes only because it switches on `every-meeting` (line 57).
3. The player is made sponsor and votes without acting. `fileLines` (world-legislating.ts, line 741) makes the most moved backer the sponsor, and the filers are every member (`filers: body.members`, line 1981), the controlled player included. Holly McGee's gap was the largest, so `draftBill` gives her as `sponsorId` and the journal piece `journal.office-line-took-office.i-introduced-law` tells it as her own act. `holdVote` then reaches `ownVote` (office-day.ts, line 627). With no choice on file and no local stop kind to wait for (the state and federal levels have `state-floor-vote` and `floor-vote`, line 657), it casts her position as `own-choice`: the vote row `yes` (position 1.34) and the act `office-act:vote:bill:office:gus2025:140688:board:2025-02-04:person_58dc6cdc4dd0560d:27`. Mary Skinner was absent and Valerie Salazar voted yes, hence 2 to 0.

**Fix.** In this order; each part is checkable alone.

1. Re-decide the stop when the agenda changes. Move the `present` test out of `postAgenda` into a small `holdPlayerIfDue(api, row)`. Call it from `postAgenda`, and from `placeFiled` and `placeOnAgenda` after they write the row. It registers the meeting stop (the same `registerStop` call, reason `office-day.meeting`) the first time the test holds, and never twice for one row (the `tokens` map already keys by row id).
2. Add the local level's own stop to the test: a vote of the player's own body where the player's seat could decide it holds by default, as the owner ruled (Oct 29, OWNER-DECISIONS.md line 417: "your own bills, any vote where yours could decide it"). Register `{ kind: "deciding-vote", byDefault: true }` beside `own-bill-vote`. A seat "could decide" a meeting when the body has at most `decidingSeats` seats (a TUNABLE parameter in src/core2/data/office-day/parameters.json, start 9, spread 5 to 15, with a stopgap row) and the agenda holds any bill. On a board of three or five every vote is close enough that one seat turns it. A count of members' positions is not read here, because the player would learn the count from it (N2, docs/coordination/night-2026-11-08/rulings-legislation.md).
3. Hold filings for the player from the moment the player takes the seat, not from when the meeting was scheduled. In `localMeeting`, file on the day only when `meetingHold` is false; when it is true on the meeting day and the row is still `scheduled`, pass `holdFor: meetingDate` so the bills go to `placeFiled` (and, after part 1, stop the player) instead of `holdVote`. That changes `const hold = meetingDate > api.state.date && ...` to include the meeting day itself.
4. Nothing filed in the player's name without the player. In `fileLines` and `fileChanges` (world-legislating.ts), leave out the controlled player (`snapshotExplicitControlV1(api.state).personId`) as a sponsor. They still count as a backer, so the majority test is unchanged. The next most moved backer sponsors instead. The player files their own bills through the bill menu.
5. `ownVote` (office-day.ts, line 627): for a local body, return without casting when the meeting row for this bill has `playerPresent` true. The player then votes at the meeting, or the meeting closes with the vote unchosen and the player abstains (the roll call in src/core2/modules/legislature.ts, line 3934: "the player is never voted for, so with no choice they abstain").

Not in this item: the street reply "I voted the way I thought was right for {place}." (`scene-talk.reply-tell.i-voted-the-way-i-thought-was-right-for-place-here-s-why`, uses `purpose: law-reaches`, `role: asked`) also fits the `law-takes-effect` situation, whose asked role is the resident the law reached, not a member (src/director/data/situation-types.json). Saying "I voted" there needs the speaker's own roll-call row. That piece lives under `data/english/parts/` and is the Story session's to change, so the words lead files it.

What each part costs: parts 1 and 2 are about 60 lines in office-day.ts plus one parameter and one stopgap row in src/core2/data/stopgaps/office.json. Part 3 is one condition in world-legislating.ts. Part 4 is a filter in two loops. Part 5 is one early return. No engine is added. The meeting screen (`office-day.meeting` in src/bench/play.mjs) already exists.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: the seat count comes from the body's record, never a named place. No dice. The player casts their own ballot (owner, Oct 13, OWNER-DECISIONS.md line 841). The important few stop by default (owner, Oct 14, line 913; Oct 29, line 417). Replace, never layer: the posting-day test is moved, not copied.

**Done when.** A second session, not the builder, plays a drawn place and seed (named) whose town or county body has at most nine seats, with Advanced start, as a member of that body, with the default stops. Pressing Day stops at the body's next regular meeting at its hour, with the meeting screen open and every member-filed bill on the agenda still undecided. No bill on that body names the player as sponsor unless the player filed it, read from dev mode's bill card. After the player adjourns without voting, the player's roll-call row on each bill is an abstention, not a cast vote. src/core2/office-day-member-filings.test.ts passes with the `every-meeting` line removed.

**Waits on.** Nothing.

**Files.** src/core2/modules/office-day.ts, src/core2/modules/world-legislating.ts, src/core2/data/office-day/parameters.json, src/core2/office-day-member-filings.test.ts, src/core2/data/stopgaps/office.json

**Notes.** Replayed on main by opus-5251, Nov 11, before any part was built. The item's bench seed 253225ee-ffc1-449c-b180-ec52013de651 is Deep River, Washington; Holly McGee (`person_58dc6cdc4dd0560d`) was selected after the world was built, and Day was pressed through Feb 13. `meeting:office:gus2025:140688:board:2025-02-04` was adjourned with `agenda: []` and `playerPresent: false`. `bill:office:gus2025:140688:board:2025-02-04:person_58dc6cdc4dd0560d:27` was enacted with `sponsorId` Holly. Holly's roll-call row on it was `yes`. The only stops on the way were two news scenes (Jan 31, Feb 12) and no meeting. After the build (pull request 8807), on the same replay, the meeting held Holly on Feb 4 at 9:00 AM with one bill on its agenda. That bill was filed on the eve by `person_c78cf8d6a43da0e6`, and Holly's row was `abstain` once she adjourned without voting.

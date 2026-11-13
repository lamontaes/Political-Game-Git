---
id: office-board-vote-cast-for-the-player-without-a-stop-again
title: "A seated player's 'no' is cast on an ordinance at a meeting that never stopped her (after office-member-ordinance-voted-without-player-stop)"
area: office
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: opus
effort: medium
root: rc2-done-from-records
source: "Playtester P3, Nov 13, 2026 (crew line #8928)"
checked:
claimed-at:
---

**What.** A player seated on a three-member selectboard pressed Week from Tue May 26, 2026, 7:00 AM. The week stopped once, at 8:00 AM on Tue Jun 2, for Stephen Pugh's scene asking her to carry Ordinance 2026-1. After it, the week ran on to Tue Jun 9 with no meeting stop. In that time the Journal said 'Because of that, I voted against Ordinance 2026-1', and the bill's roll call holds her vote as 'no'. She never saw the meeting or pressed a vote. The ordinances that came after it (2026-2 to 2026-5, Jul 7 to Oct 6) each stopped her at the meeting as they should. Seen: the Journal toast, and the Bills record of Ordinance 2026-1.

**Cause.** Measured: North Hyde Park, Vermont, seed a6b481a5-c6c9-432b-8cca-c0463c518da8, main 9ebc7c89. /api/dev/bodies shows bill:office:gus2025:187833:board:2026-06-01:... (number 2026-1), introduced 2026-06-01, sponsor person_3bd0dafe8c6796b5, enacted, with Sofia Nash (person_87d69448f9567bef) voting 'no' (Playtester P3, Nov 13, 2026). Found in code: not yet. Part 5 of the merged office-member-ordinance-voted-without-player-stop (#8807) makes ownVote in src/core2/modules/office-day.ts cast nothing once the meeting row has playerPresent, and part 3 holds a bill filed on the meeting day for the player. A cast 'no' means neither held for a bill introduced the day before its meeting. The cause is either that the bill reached the meeting row before holdPlayerIfDue ran, or that the 8:00 AM scene's Continue resumed the week without the meeting stop. The fixer replays this seed with BENCH_SEED and reads which one happened.

**Fix.** Find which branch above let ownVote cast, and make every vote of the player's own board stop her as #8807 intended. Add the failing case, a bill introduced the day before its meeting with a director stop that morning, to the office-day test.

**Time box.** 3 hours for one Opus session at medium effort. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No vote is cast in the player's name without the player (#8807, part 5). One rule, all 56 places. Ask why: the roll-call row names who cast it.

**Done when.** A second session plays a seated board member in a drawn place, named with its seed, on main, through two meetings where a scene stops the player the same morning. Each meeting stops her, and no roll-call row of hers exists that she did not press. A test of a bill filed the day before its meeting fails on main.

**Waits on.** Nothing. T14's #9022 changes when agendas are filed and may touch the same path, so re-check this on main once it merges.

**Files.** src/core2/modules/office-day.ts, src/core2/modules/world-legislating.ts, src/bench/play.mjs

**Notes.** More from the same record (Playtester P3, Nov 13). The bill is bill:office:gus2025:187833:board:2026-06-01:person_3bd0dafe8c6796b5:62, Ordinance 2026-1 (budget lines), introduced Mon Jun 1, 2026. The board's regular meeting would have been Tue Jun 2 at 6:00 PM. Its roll call holds only her 'no'; Stephen Pugh's and Logan Tyson's rows are null, yet the bill reads enacted. The Journal toast with her 'no' showed when the week stopped at 8:00 AM on Jun 2, so the vote was cast before that evening's meeting, on Jun 1 or early Jun 2. I did not open the Calendar that week, so whether it listed the meeting is not known. Replaying the seed with BENCH_SEED to Jun 1, 2026 answers it. This was seen under the yearly-board bug (all three seats elected every year, fixed in #9023), and her seat in 2026 rests on that count. The vote itself does not depend on a re-election.

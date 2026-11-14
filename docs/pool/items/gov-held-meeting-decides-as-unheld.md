---
id: gov-held-meeting-decides-as-unheld
title: "A meeting held for the player decides the same bills the same way as one that is not held"
area: gov
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/project-thread-nn1p6c
pr: 9051
after:
blocked-on:
lead: governing
model: fable
effort: medium
root: none
source: found while building meetings-resident-player-speaks-at-public-comment
---

**What.** When a town or county body's meeting is held for the player (the player sits on the body and holds the clock), the body votes bills that the same meeting lets die unvoted when nobody is held, and it takes them in a different order. So the town's law depends on whether the player was in the room, even when the player does nothing. Seen: the meeting panel's agenda and each item's result (voted, or failed without a vote), and the town's ordinances afterward.

**Cause.** Found in code: src/core2/modules/world-legislating.ts, holdSession, skips the moot check for a held meeting (`reached && !input.holdFor ? mootAtFloor(...)`) and leaves each reached bill drafted; src/core2/modules/office-day.ts, closeMeeting, adjourn and takeUpItem, then call holdVote on every item with no moot check, and placeFiled and placeOnAgenda sort the agenda by bill id, not by the order filed. Measured: Orwin, Pennsylvania (key 4257192), place seed 1789d59120a1522ed3b3c99bbfc50de39d95e18abf1b65263074a510361c5888, 100 days from the start: 15 bills decided with the meetings held against 17 not held; bills 2025-7 and 2025-10 of board office:gus2025:173737:board fail with no vote when not held, and when held one is voted down 3 to 4 and the other enacted 7 to 0.

**Fix.** "Decide for me" at a held meeting casts the member's own vote, as it says (today the own-vote hook returns while the player is present, so the roll call records an abstention: Belfast, New York, key 3605562, place seed 7d73a21529f219a6867427dbe11f8f808504cb18968889d4a20702a1f4547c0d, ordinances 2025-1 and 2025-2). A held bill comes to its vote the way the floor takes any bill: at take-up and at the meeting's close, run the same moot check the unheld path runs, and let a moot bill die unvoted with the law row it repeats on its record. Keep the agenda in filing order. The session record's reader for recently defeated measures must not count a held bill that died moot as voted down. No new engine: one vote entry in world-legislating.ts that office-day.ts calls. And one filing path (found Nov 13 in Elizabethtown, Indiana, key 1820692, place seed fcad6dc9215fc941ce39501ad985fc28419c852d4dab6e3dd5220a7b1d462a7a: a held meeting files on the eve and an unheld one files and votes in one step, so with a night between the town heard of council Ordinance 2025-3, residents spoke against it, a section was traded in, the mayor vetoed and the council overrode, 18 bills decided against 16): every town and county body files its members' ordinances the day before and votes them at the meeting, held or not; only a meeting with under a day's notice files on its own day. And one order for meetings of the same day (found Nov 13 in Heber Springs, Arkansas, key 0531090, place seed fb9b371a2c260c1e5bd2ea80924b870a320f30742d81a7daca8fe7535f0c943d: the county board and the council both met February 4, 2025; with the player away the board's new law on civilian oversight of police stood when the council voted, and at the player's stop it did not, so one council member voted no on Ordinance 2025-4 held and yes away): before a body votes, every other body meeting that day at an earlier hour has voted, at the player's stop and at the meeting's close alike. A law the state or Congress passes that same day is left to `gov-held-meeting-reads-the-day-before-other-governments-act`.

**Time box.** 2 hours

**Rules.** One engine per mechanic: the moot check is the one in world-legislating.ts. No dice. Wire to the world: prove it with twin worlds in drawn places. No steering: the player's presence alone changes no outcome.

**Done when.** A second session sees it in the running game: in a drawn place and seed the builder did not choose, the same world played twice for 100 days, once with the player held at every meeting of a local body and casting each member's own vote, once with nobody held, shows the same bills decided with the same result and the same votes by member; the speed:year time is no more than 20 percent over main.

**Waits on.** Nothing.

**Files.** src/core2/modules/world-legislating.ts, src/core2/modules/office-day.ts, src/core2/office-day-attend.test.ts (new)

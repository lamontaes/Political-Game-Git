---
id: words-talk-never-adds-the-person-to-who-you-know
title: "Talking to someone never makes them someone you know, so people both know and their news never come up in play"
area: words
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after: words-home-school-mutual-lines-are-composed
blocked-on:
lead: words
model: opus
effort: medium
root: none
source: Words builder W4, Nov 11, 2026, from twelve weeks of bench play on the branches of PR 8801 and PR 8816
checked:
claimed-at:
branch:
---

**What.** The player talks to dozens of people around town, but none of them joins the people the player knows. So the talks the owner asked for on Nov 11 ("This introduces people to their world") that need someone both people know never fire in play: a person both know raised with what happened to them ("Did you hear about Alex? Moved over to Hawaii County.", PR 8816), and a relative asked after by someone who knows them (PR 8801). In twelve weeks of an adult life in Kingsville, Maryland (seed w4seed-d), visiting every place in town each week and talking to everyone there, about 400 lines were said and not one was about someone both know or a relative's news. Seen: a talk with someone you met last week who brings up a person you both know, by name, with what happened to them and when.

**Cause.** Found in code: on main at 0cfb47e859, as follows.

- **Nobody calls `meet`.** The core's one writer of who knows whom is `meet` (src/core2/state.ts line 1354), which adds each person to the other's `knownIds`. Opening a talk (`/api/talk/open`, src/bench/handler.ts line 582, calling `openConversation`, src/director/conversation.ts line 2668) and saying a line (`say`) record time together through `api.relationship` with cause `conversation`, never `meet`. So a person the player has only talked to is not in `player.knownIds`.
- **What reads it.** `subjectsBetween` raises `mutual` only for an id in both people's `knownIds`, and `family` only for a relative the listener knows. So in play the only people both know are the player's starting circle, mostly relatives, and a relative's news is then asked after as `family`, as it should be.
- **A second, smaller cause.** An unwatched person's new job is not a core event: `recordedMoments` (src/director/conversation.ts line 504) reads `core.logByPerson`, and a job start shows up only as a `money:job-started` moment in a watched person's ledger. So of what happens to people outside the player's circle, only moves, illnesses and births reach `familyNews` (line 571).

**Fix.**

1. When a talk opens with someone the player does not know, call `coreAPI(core).meet(playerId, otherId, { placeId, sourceId: <the conversation's id>, cause: "met-in-conversation", hours })` through the existing writer, once per pair. That gives the hours of the talk and the name the player learned. Do it in `openConversation`, so every talk, the bench's included, goes through it. No new record kind.
2. Have the jobs engine's hire write the event it already describes (a job start for that person, in `logByPerson`), so `recordedMoments` reads it for an unwatched person. If no such event exists, register the gap as a stopgap in the jobs family file and leave it; part 1 alone makes the talks reachable.
3. Test in src/director/family-news-talk.test.ts, on drawn places: after the player talks with two coworkers at one place, one of them moves away (the moves engine's own `person.moved-away`), and the other, in a later talk, raises the move by name.

**Time box.** 3 hours for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No dice. One rule, all 56 places: the tests draw their places. An effect is a read: the talk reads the `knownIds` the core keeps, and nothing keeps a second list. Ask why: a person is raised only for a recorded happening, and the line cites it.

**Done when.** A second session, in the running game on main at 1440x900, starts three new adult lives in drawn places it writes down with their seeds, talks to people at their workplaces for two weeks without dev mode, and finds in at least one place a talk where someone brings up a person both know by name, with what happened to them and when. The person's card for that acquaintance opens from the People screen. The PR's before and after pictures, the item for PR 8816, can then be taken.

**Waits on.** Nothing.

**Files.** src/director/conversation.ts, src/core2/state.ts (read only), src/bench/handler.ts (read only), src/director/family-news-talk.test.ts, the jobs engine's hire (for part 2).

**Notes.** Found by Words builder W4 while taking the pictures for PR 8801 and PR 8816 (Nov 11). With dev mode's illness, Kingsville, Maryland (seed w4seed-d) gave "How's your partner?" / "James took sick yesterday." on day 4: the relative is in the player's starting circle. A person met that week never was.

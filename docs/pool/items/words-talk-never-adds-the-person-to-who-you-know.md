---
id: words-talk-never-adds-the-person-to-who-you-know
title: "Talking to someone never makes them someone you know, so people both know and their news never come up in play"
area: words
kind: bug
priority: 1
size: S
status: merged
standard: 2
claimed-by: claude/words-w4-meet
pr: #8836
after: words-home-school-mutual-lines-are-composed
blocked-on:
lead: words
model: opus
effort: medium
root: none
source: Words builder W4, Nov 11, 2026, from twelve weeks of bench play on the branches of PR 8801 and PR 8816
checked:
claimed-at:
branch: claude/words-w4-meet
merged-at: 2026-11-11T18:53:41.909Z
---

**What.** The player talks to dozens of people around town, but none of them joins the people the player knows. So the talks the owner asked for on Nov 11 ("This introduces people to their world") that need someone both people know never fire in play: a person both know raised with what happened to them ("Did you hear about Alex? Moved over to Hawaii County.", PR 8816), and a relative asked after by someone who knows them (PR 8801). In twelve weeks of an adult life in Kingsville, Maryland (seed w4seed-d), visiting every place in town each week and talking to everyone there, about 400 lines were said and not one was about someone both know or a relative's news. Seen: a talk with someone you met last week who brings up a person you both know, by name, with what happened to them and when.

**Cause.** Found in code: on main at 0cfb47e859, as follows.

- **Nobody calls `meet`.** The core's one writer of who knows whom is `meet` (src/core2/state.ts line 1354), which adds each person to the other's `knownIds`. Opening a talk (`/api/talk/open`, src/bench/handler.ts line 582, calling `openConversation`, src/director/conversation.ts line 2668) and saying a line (`say`) record time together through `api.relationship` with cause `conversation`, never `meet`. So a person the player has only talked to is not in `player.knownIds`.
- **What reads it.** `subjectsBetween` raises `mutual` only for an id in both people's `knownIds`, and `family` only for a relative the listener knows. So in play the only people both know are the player's starting circle, mostly relatives, and a relative's news is then asked after as `family`, as it should be.
- **A second, smaller cause.** An unwatched person's new job is not a core event: `recordedMoments` (src/director/conversation.ts line 504) reads `core.logByPerson`, and a job start shows up only as a `money:job-started` moment in a watched person's ledger. So of what happens to people outside the player's circle, only moves, illnesses and births reach `familyNews` (line 571).

**Fix.** (Fable B's reviews, Nov 11, 15:26Z and the second, changed the first draft: through the encounters engine, the person talked to only, from the talk route, the People screen listing everyone known, and the jobs gap as a stopgap.)

1. **Through the encounters engine.** Meeting people has one engine, src/core2/encounters.ts (`meetAtVisit`, `meetAtJoin`, `meetAtWork`), with its causes in src/core2/data/encounters.json. Add `meetInTalk` beside them, its cause a row in that data file (`metInTalk`), its hours the talk's own time (the exchanges said times `minutesPerExchange`). The director's `meetOverTalk` calls it through the people family's entry (src/core2/modules/people.ts), and only the talk route (`/api/talk/open`, src/bench/handler.ts) calls `meetOverTalk`, after the talk it opened has a line by the other person. `openConversation` writes no meeting: the room's probe of who has something to say (`sceneNow`) opens a talk with everyone present. No cause string typed in the director.
2. **Who is met.** The person talked to, once per pair, only when the talk really opens (they said a line), not when a card is opened. Whether the others standing in the room are met too is not part of this item.
3. **The jobs gap.** The jobs engine's hire writes no event naming the person, so an unwatched person's new job is never news. It is registered as `SG-JOBS-job-start-not-a-person-event` in src/core2/data/stopgaps/jobs.json, with no new record kind.
4. **The People screen lists everyone known.** The card (src/bench/card.ts) carries `known`, every relationship record of the person, closest first; its own `ties` page stays the closest eight. The People screen (src/bench/play.mjs) lists all of `known` by group, closest first in each.
5. **Test** in src/director/family-news-talk.test.ts, on drawn places: the room's probe over everyone present changes nobody's `knownIds`; one talk opened the route's way meets exactly that person. Before any talk the player does not know two people who know each other; after a talk with each, each knows the player, and when one moves away (the moves engine's own `person.moved-away`), the other has them as someone both know.

**Time box.** 3 hours for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No dice. One rule, all 56 places: the tests draw their places. An effect is a read: the talk reads the `knownIds` the core keeps, and nothing keeps a second list. Ask why: a person is raised only for a recorded happening, and the line cites it.

**Done when.** A second session, in the running game on main at 1440x900, starts three new adult lives in drawn places it writes down with their seeds, talks to people at their workplaces for two weeks without dev mode, and finds in at least one place a talk where someone brings up a person both know by name, with what happened to them and when. The person's card for that acquaintance opens from the People screen. The PR's before and after pictures, the item for PR 8816, can then be taken.

**Waits on.** Nothing.

**Files.** src/director/conversation.ts, src/core2/encounters.ts, src/core2/state.ts (read only), src/bench/handler.ts, src/bench/card.ts, src/bench/play.mjs, src/director/family-news-talk.test.ts, the jobs engine's hire (for part 2).

**Notes.** Found by Words builder W4 while taking the pictures for PR 8801 and PR 8816 (Nov 11). With dev mode's illness, Kingsville, Maryland (seed w4seed-d) gave "How's your partner?" / "James took sick yesterday." on day 4: the relative is in the player's starting circle. A person met that week never was.

- 2026-11-11, Words builder W4: built on claude/words-w4-meet from main, as Fable B asked at 15:26Z, before the 16:00 notes carried the item to main (not claimed).
- 2026-11-11, Words builder W4: Fable B's second review: the meeting moved from `openConversation` to the talk route, and the People screen lists everyone known.

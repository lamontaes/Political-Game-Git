---
id: words-run-poll-problem-lines-are-composed
title: "Trouble at the polls is talked through by name: the voter, the precinct, the polling place they belong at and the worker who knows them"
area: words
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after: scene-trouble-at-the-polling-place
blocked-on:
lead: words
model: opus
effort: medium
root: rc4-hand-written-words
source: owner, Nov 11, 2026 (docs/coordination/OWNER-DECISIONS.md, "Nov 11: every line goes through the English engine"); planned for Fable B from a read of main at 5ef67361
checked:
claimed-at:
branch:
---

**What.** On election day a poll worker cannot find the voter on the list. The scene's lines exist and none says where the voter is or where they should be: "Spell the last name for me?", "I'm sorry. You're not on the voter roll for this precinct.", "I've voted here for years. What changed?" 62 of the 64 lines under the `poll-problem` purpose have no insert, the highest share of any purpose on this path. No producer stages the scene yet (scene-trouble-at-the-polling-place, open), so this item is built after it. Seen: the talk box at the polling place on election day, when the poll worker cannot find the player on the list, and the player's replies.

**Cause.** Found in code: the `polling-place` type in src/director/data/situation-types.json carries purpose `poll-problem` and `awaitingProducer: "election-day"`; no code reads `poll-problem`. src/director/polling-place.ts already holds what the lines need: the voter's polling place for their precinct (`pollingPlaceId`), who works it that day (`pollWorkerIds`), the place's name (`place`) and the ballot's contests. The only fact any piece names is `{name}` (once), and two lines require `candidate`. Every step (`state/deliver-news`, `reply/accept`, `request`, `confront`, `ask`, `leave`; `follow/offer`, `apologize`; the closes) is whole sentences.

**Fix.**

1. **Compose.** Use the scene composer from words-run-filing-clerk-lines-are-composed (step 1, in `wordSceneMove`).
2. **The facts.** The producer from scene-trouble-at-the-polling-place stages the scene with its reason (the voter's precinct differs from the place's, or they moved since the last election). Pass `name` (the voter, as the worker reads it off the list), `polling-place` (where the voter is here, by `place`), `right-place` (the polling place of the voter's own precinct, from the voting engine in src/core2/modules/voting.ts), `moved-when` for a move (`spokenWhen` in src/director/words.ts), and `acquainted` when the worker knows the voter (`knownIds`), each citing its record. Declare the slots in the bank's `slots` map.
3. **The parts.** The worker's news (`state/deliver-news`): a required core naming `{name}` and `{polling-place}`, with a reason by cause naming `{right-place}` or `{moved-when}`, at least 6 cores and 6 reasons per cause. The worker's answers (`follow/offer`, `follow/apologize`, `follow/answer`): a core naming `{right-place}` or `{name}`, at least 6 per move. Greetings and closes: a core naming `{name}`, with the short lines kept as openers.
4. **The replies.** Up to four, each a different move, at least 8 wordings each, each naming the place or the record: ask why (`ask`, answered by the cause), ask where to go (`request`, answered by `{right-place}`), push back (`confront`, naming `{polling-place}`: "I've voted at {polling-place} for years."), and leave without voting (`leave`). `accept` of a provisional ballot is not offered until the owner rules on it (scene-trouble-at-the-polling-place registers that question). `expectUpToFourDifferent` (src/director/reply-set-check.ts) passes.
5. **What it writes back.** The producer's item writes the outcome the voting engine already has (the vote cast at the right place, or no vote); `replyInScene` (src/director/purpose-scene.ts) writes `scene.reply` with the ending (`fixed`, `left-without-voting`, `scene-at-the-polls`, which the press reads as `story-runs`). Name the record ids in the pull request.
6. **Delete what this replaces, with every reference.** The 62 lines with no insert under `poll-problem`. None is graded good, and none serves another purpose. Then `npm run words:grade` and `npm run words:rules` twice.
7. **Lower the guard's count** for `scene-talk` in tests/guards/english/line-inserts-baseline.json.
8. **Tests.** In src/director/polling-place.test.ts, on drawn places: a voter who moved hears the right polling place named; a worker who knows the voter speaks differently from one who does not; every reply set passes `expectUpToFourDifferent`. Run tests/guards/english and the bank tests yourself.

**Time box.** 3 hours for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No hand-written player text in code. No dice: the cause is the voter's record, never a chance of a problem. One rule, all 56 places: precincts and polling places come from each place's records, and the tests draw their places. This is a game, not a spreadsheet: a provisional ballot is not added here without the owner's ruling.

**Done when.** A second session, in the running game on main at 1440x900, plays three new lives in drawn places it writes down with their seeds to election day, with a life whose records give the polls a problem (a move since the last election). At the polling place the worker names the voter and where they should vote, and the replies are at most four different moves, each naming the place or the reason. It picks "where do I go" and votes at the place named. tests/guards/english passes with the lowered count.

**Waits on.** scene-trouble-at-the-polling-place (the producer that stages the scene), and the CTO's ruling on whether the builder drafts the `data/english/parts` lines with `Review: words` or the Story session writes them (the same question as words-opening-evening-talk-raises-what-the-president-said; PR #8715).

**Files.** src/director/polling-place.ts, src/director/polling-place.test.ts, src/director/purpose-scene.ts, src/director/words.ts, src/director/reply-set-check.ts, src/director/data/situation-types.json, src/director/data/purpose-arcs.json, src/english/scene-talk-words.ts, src/core2/modules/voting.ts, data/english/parts/scene-talk.json, tests/guards/english/line-inserts-baseline.json

**Notes.** Planned by Fable B's Words planner (2026-11-11) from main at 5ef67361. 64 lines, 62 with no insert and not excused. Three today: "Spell the last name for me?", "I'm sorry. You're not on the voter roll for this precinct.", "I've voted here for years. What changed?" This item is also `after:` words-run-filing-clerk-lines-are-composed for the composer; the pool field holds the producer, which is the longer wait.

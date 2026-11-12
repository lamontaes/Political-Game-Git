---
id: words-run-race-told-lines-are-composed
title: "Hearing how a race came out, both sides of the talk name the winner, the margin and the place, and the bearer's own stake in it"
area: words
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after: words-run-filing-clerk-lines-are-composed
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

**What.** After an election, someone tells the player how a race came out. Their telling already names the winner and the office ("{winner} won {office}."), and five lines the owner liked carry on with it. But the player's replies and the teller's answers are mostly fixed: "How did it happen?", "What did the count look like?", "Does anyone know why it went that way?", and nine comforts with no name in them. 53 of the 101 lines under the `race-told` purpose have no insert. Seen: the talk box the day after an election, when a relative or friend tells the player the result, and the player's replies.

**Cause.** Found in code: the `race-told` type in src/director/data/situation-types.json fires on `circumstance:race-result-known` for a race the player did not win. `composeBinding` in src/director/purpose-scene.ts adds `office`, `resultFacts` (`winner`, `you-ran`, `bearer-won`, `bearer-lost`, `bearer-ran`, `winner-is-other`) and `raceTurnoutFacts` (src/director/race-turnout-facts.ts: `vote-share`, `turnout`, `best-place`). `state/tell` uses them (20 lines, all with inserts). The replies (`reply/ask` 6 of 7 with no insert, `comfort` 9 of 9, `tell` 9 of 10, `deflect` 4 of 4) and most follows carry none, so the player's question "What did the count look like?" is answered by a line that may not name the count. The margin is in the result record's `totals` but is passed as `lead` only when the asked person won. Where the teller stands on the winner (their lean against the winner's party: `personLean` and the winner's party) is on record and not passed.

**Fix.**

1. **Compose.** Use the scene composer from words-run-filing-clerk-lines-are-composed (step 1, in `wordSceneMove`).
2. **The facts.** Pass `margin` (the winner's lead over the runner-up, from the result record's `totals`, said as votes) for every result, not only a win, and `bearer-side` (`with` or `against` the winner, from the teller's lean against the winner's party, or none when either is even), each citing the result record and the views record.
3. **The parts.** The teller's answers (`follow/answer`, `follow/accept`, `follow/press`, `follow/thank`): a required core naming `{winner}`, `{margin}`, `{vote_share}`, `{best_place}` or `{turnout}`, chosen by the question it answers, at least 6 per move; a reason by `bearer-side` (at least 6 each). The closes: a core naming `{winner}` or `{office}`, at least 6.
4. **The replies.** Up to four, each a different move, at least 8 wordings each: ask about the count (`ask`, naming `{office}`, answered by `{margin}` and `{vote_share}`); comfort them (`comfort`, naming `{first}` or `{office}`, offered only where `bearer-lost` or `bearer-side` against); say what you make of the winner (`tell`, naming `{winner}`); and shrug it off (`deflect`, naming `{winner}`). `expectUpToFourDifferent` (src/director/reply-set-check.ts) passes.
5. **What it writes back.** `replyInScene` (purpose-scene.ts) writes the `scene.reply` record with the ending (`shared-it`, `stood-with-them`, `shrugged-it-off`, `asked-how`), and the time together reaches the tie through the core's writer. Every ending keeps `none` today, so the journal skips it (`journal.ts` reads `keeps`). Give `stood-with-them` a `keeps` the journal and the tie already read (the purpose-arcs.json endings' kinds; no new kind), and name the record ids in the pull request.
6. **Delete what this replaces, with every reference.** The 53 lines with no insert under `race-told`, except those the owner graded good, which stay: "It matters to me whoever won. I live under what they decide.", "Of course I care who won. They're the ones who govern me.", "I can't say I'm filled with confidence.", "I'm a little apprehensive." (the fifth carries an insert). They become openers or reasons of the new replies and keep their grade rows. Then `npm run words:grade` and `npm run words:rules` twice.
7. **Lower the guard's count** for `scene-talk` in tests/guards/english/line-inserts-baseline.json.
8. **Tests.** In src/director/race-told-scene.test.ts, on drawn places: the answer to the count question names the margin or the share; a teller who backed the loser and one who backed the winner speak different lines about the same race; every reply set passes `expectUpToFourDifferent`. Run tests/guards/english and the bank tests yourself.

**Time box.** 4 hours for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No hand-written player text in code. No dice: the side is the teller's recorded lean. Ask why: every figure cites the result record. One rule, all 56 places: the tests draw their places.

**Done when.** A second session, in the running game on main at 1440x900, plays three new lives in drawn places it writes down with their seeds through an election day, until someone tells the player a race's result. Each telling names the winner and the office, and the answer to the count question names the margin or the winner's share as the result record has it. The replies are at most four different moves about that race. tests/guards/english passes with the lowered count.

**Waits on.** The CTO's ruling on whether the builder drafts the `data/english/parts` lines with `Review: words` or the Story session writes them (the same question as words-opening-evening-talk-raises-what-the-president-said; PR #8715).

**Files.** src/director/purpose-scene.ts, src/director/race-turnout-facts.ts, src/director/race-told-scene.test.ts, src/director/reply-set-check.ts, src/director/journal.ts, src/director/data/purpose-arcs.json, src/english/scene-talk-words.ts, src/core2/modules/views.ts, data/english/parts/scene-talk.json, data/english/part-grades.json, tests/guards/english/line-inserts-baseline.json

**Notes.** Planned by Fable B's Words planner (2026-11-11) from main at 5ef67361. 101 lines, 53 with no insert and not excused. Three today: "How did it happen?", "What did the count look like?", "Does anyone know why it went that way?" words-race-told-same-lines-opposite-speakers (PR #8446, in a pull request) changes the same lines for the teller's tie; build on it once it merges, or merge it in first.

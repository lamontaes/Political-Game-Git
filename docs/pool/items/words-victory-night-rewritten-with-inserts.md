---
id: words-victory-night-rewritten-with-inserts
title: "Election night says what the count and the campaign hold: how close it was, who ran against you, the day you take office, the plank you ran on and who worked for you"
area: words
kind: bug
priority: 1
size: M
status: in-pr
standard: 2
claimed-by:
pr: 9996
after:
blocked-on:
root: rc4-hand-written-words
lead: story
model: sonnet
effort: medium
milestone: play-first
source: owner, Oct 8 and Oct 24, "the win or lose is the step after the campaign", and Nov 16, "No. Count them again and rewrite them with inserts", "either that or remove them and start fresh"
---

**What.** The night a candidate wins (`race-won`, purpose `victory-night`) held 81 lines, all fixed text placed by nothing: a campaign manager with a sheet of paper in a hallway at every count, "Ninety seconds, tops", "That you bought the race. It was on the eleven o'clock news", "We start Monday", a promise to "call them tomorrow" with nobody named. No record held the manager, the story, the door count or the plank. The night now says only what the count, the voting engine's result and the campaign's own record hold, in the words of the people who worked the race.
Seen: a candidate wins a local race in a drawn place, and the talk after the count names the office, the one they beat, how the race went (by a hair, by a wide margin, or with nobody against them), the day the term begins, the plank they ran on, and the one who ran the campaign or the size of the crew, each only where its record holds.

**Cause.** Found in code: `excusedAs` in tests/guards/english/line-inserts.test.ts counts a line as placed when its use names any fact, and the `victory-night` pieces in data/english/parts/scene-talk.json carried only `excludesFacts`, `requiresFacts` or nothing, so they were never counted as fixed text, and `composeBinding` in src/director/purpose-scene.ts set `office` and `opponent` from the count but no fact for the margin, the day the term begins, the winner's plank or the campaign's crew, doors, ads and money, so no line could be placed by them.

**Fix.** Delete every `victory-night` line (81, all dedicated to this purpose) and write the families the spec names from the facts the records hold. Add `victoryNightFacts` in src/director/victory-night-facts.ts, called from the `race-won` block of `composeBinding`: `opponent` (the runner-up, by full name), `unopposed`, `margin-close` and `margin-wide` (the one margin reader, `raceMargin`), `takes-office` (the result row's `takesOffice`, said as a day ahead), `plank` (the count record's mandate topic, as the question is said), `ran-it` and `manager` (the campaign row's staff), `volunteers` (the crew as a size, `crewSaid` in src/english/count-words.ts), `doors` and `raised-least` (the campaign's own row against the others'), `first-race` (the player's own filings), and `at-home` and `at-venue`. Lower scene-talk's count in tests/guards/english/line-inserts-baseline.json by what the deletion removes.

**Time box.** 6 hours, Sonnet at medium effort.

**Rules.** No hand-written player text: every line is a bank piece placed by a fact the packet sets and none is typed in code. No figure in talk (rule 101): the margin, the crew and the money are said as words. Wire to the world: each fact is read from the count, the voting result or the campaign row, so a line plays only where its record holds.

**Done when.** In a drawn place (Town, State, seed nobody chose), a second session plays a local race to its count through the elections force recipe, presses every reply at the venue and at home, and finds each fact a line leans on is the record's by id: the margin facts agree with the result's totals, `manager` is set only where the campaign's staff holds someone, and no `victory-night` line plays on a lost race. The line-inserts count for scene-talk is lower than before.

**Waits on.** Nothing.

**Files.** data/english/parts/scene-talk.json, data/english/count-words.json, src/english/count-words.ts, src/director/victory-night-facts.ts, src/director/victory-night-facts.test.ts, scripts/words/victory-night-play.ts, src/director/purpose-scene.ts, scripts/words/victory-night-walk.ts, tests/guards/english/line-inserts-baseline.json, data/english/pulled.json

**Notes.**

- 2026-11-17 (Story lead's builder, Sonnet): drafted from the Story lead's spec. See the pull request for the counts, the played talks and the lines for the lead to sign.

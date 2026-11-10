---
id: scene-trouble-at-the-polling-place
title: "A problem at the polls plays as a scene with the poll worker: the poll-problem lines exist and nothing stages them"
area: director
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: "words-and-scenes lead, Oct 27, scene web election-day pass"
lead: director
milestone: play-first
claimed-at:
after:
model: opus
effort: medium
root: design-story-director
checked: fable 2026-11-10
---

**What.** The polling-place type and its poll-problem lines (poll workers, the voter, neighbors in line) are on main, but the type waits on a producer named election-day, and the bench's election morning and ballot never call it. No code reads poll-problem. The packet docs/design/scenes/from-life/trouble-at-the-polling-place.md shows the real pattern: a voter is not on the list at that precinct and is offered a provisional ballot, or is sent to the right place. A poll worker who knows the voter says so. Seen: election morning: a poll worker tells a voter who is not on the list to cast a provisional ballot (election day is a scene, owner Oct 14).

**Cause.** Found in code: src/director/data/situation-types.json, the polling-place type (line 2235), carries awaitingProducer election-day with purpose poll-problem; src/director/polling-place.ts stages the visit and reads pollWorkerIds (line 71) but no code produces a problem; src/core2/modules/voting.ts has no provisional-ballot outcome.

**Fix.** Add a producer that, when a voter's record gives the polling place a reason (their precinct differs from the place's, or they moved since the last election), stages polling-place with a poll worker from pollWorkerIds, and write the voter's choice back with the outcomes the voting engine already has: the right place found and the vote cast there, or no vote. Do not add a provisional ballot here. It is a real-world step in the player's own life that no ruling asks for (AGENTS.md, "This is a game, not a spreadsheet"): register a stopgap of kind `owner-decision` for it and write the question under OWNER DECISIONS NEEDED in the pull request.

**Time box.** 4 hours.

**Rules.** No dice: a problem at the polls comes from a record (the voter's precinct differs from the polling place's, the voter moved, an ID rule in force), never a chance. One rule, all 56 places: the state's own rules are data. Scene standard: the poll worker is cast from the polling place's own workers.

**Done when.** A second session, in a buildBenchWorld drawn place (seed named) where a voter's record gives the polling place a reason, sees polling-place staged with the poll worker from pollWorkerIds, citing the polling-place record. The voter's choice is written back: the right place found and the vote cast there, or no vote. A test fails when the scene stages with no reason on record, and the owner-decision stopgap for a provisional ballot is registered with its question in the pull request.

**You will see.** At the polls, the poll worker looks up and says you're not on this precinct's list, and offers a provisional ballot.

**Screenshot.** The scene at the polling place in the bench, with place and seed.

**Waits on.** Nothing.

**Files.** src/director/polling-place.ts, src/director/data/situation-types.json, src/core2/modules/voting.ts, docs/design/scenes/from-life/trouble-at-the-polling-place.md

**Notes.** The engine side (a provisional ballot status, the office's review after election day, state ID rules) needs the voting engine; the packet's Gaps name it.

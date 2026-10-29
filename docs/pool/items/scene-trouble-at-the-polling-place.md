---
id: scene-trouble-at-the-polling-place
title: "A problem at the polls plays as a scene with the poll worker: the poll-problem lines exist and nothing stages them"
area: director
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "words-and-scenes lead, Oct 27, scene web election-day pass"
lead: director
milestone: play-first
claimed-at:
---

**What.** The `polling-place` type and its `poll-problem` lines (poll workers, the voter, neighbors in line) are on main, but the type is `awaitingProducer: election-day`, and the bench's election morning and ballot never call it. No code reads `poll-problem`. The packet `docs/design/scenes/from-life/trouble-at-the-polling-place.md` shows the real pattern. A voter is not on the list at that precinct and is offered a provisional ballot, or is sent to the right place. A poll worker who knows the voter says so.

**Rules.** No dice: a problem at the polls comes from a record (the voter's precinct differs from the polling place's, the voter moved, an ID rule in force), never a chance. One rule, all 56 places: the state's own rules are data. Serves `scene-standard`: the poll worker is cast from the polling place's own workers.

**Done when.** When a voter's record gives the polling place a reason (their precinct differs from the place's, or they moved since the last election), a buildBenchWorld drawn place (seed named) stages `polling-place` with the poll worker from `pollWorkerIds`, citing the polling-place record. The voter's choice is written back: a provisional ballot cast, the right place found, or no vote. A test fails when the reason is present and no scene stages.

**Time box.** 4 hours.

**You will see.** At the polls, the poll worker looks up and says you're not on this precinct's list, and offers a provisional ballot.

**Screenshot.** The scene at the polling place in the bench, with place and seed.

**Files.** src/director/polling-place.ts, src/director/data/situation-types.json, src/core2/modules/voting.ts

**Notes.** The engine side (a provisional ballot status, the office's review after election day, state ID rules) needs the voting engine; the packet's Gaps name it.

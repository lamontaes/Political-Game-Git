---
id: words-concession-night-proof
title: "Prove the night-of-the-race concession call fires on both sides from one count in a played year"
area: words
kind: bug
priority: 3
size: S
status: done
claimed-by: story/concession-call
pr: #8160
blocked-on:
lead: words
source: coordinator, Nov 10 (scenes-from-life: the loser calls the winner; look-first found the scenes built)
claimed-at: 2026-11-10T16:00:00.000Z
merged-at: 2026-11-10T17:26:21.874Z
seen-by: second-session-2
seen-at: 2026-11-11T01:25:54.291Z
---

**What.** The look-first search found the scenes already built: `race-lost` (purpose `concession-call`) asks the loser, by the loser's supporters, to call and concede; the reply writes the press's `concession:<contest>:<person>:yes|no` record; `concession-taken` has the winner answer the conceded call, as gracious or gloating by their traits and the pair's tie; `concession-received` is the winner's side of the same call. Their separate tests are fixture-heavy (the reported test failed at seed 5 across 16 places for want of two filers on the ballot or a runner-up who filed). This item adds one test that stages a contested race and checks both sides fire from the one `election-result` record, with the record ids and the reply written back.

**Rules.** No new scene; nothing in src/core2.

**Done when.** src/director/concession-night.test.ts passes on two seeds and prints the loser's ask, the winner's answer and the winner's hearing, each with the count's and the concession's record ids.

**Files.** src/director/concession-night.test.ts

**Notes.** Seen in the game (2026-11-11, second-session-2): drawn seeds 1611a4081e31 and 7ae2be4ff3b9 (test worlds), seed 1611a4081e31, 7ae2be4ff3b9, main 32a6683b: concession-night.test.ts passed on two fresh seeds, one test passing each time

---
id: tests-political-asks-accusation-no-reader-knows-the-player
title: "The pinned accusation test at Adams, Massachusetts is red: the bribe story is printed and read, and none of its 20 readers knows the player"
area: director
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
lead: lying
source: story builder thread, Nov 16, the Account lead's ask on the reds of #9604
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** The accusation test is pinned to Adams, Massachusetts and is red on the Train. The bribe report is printed by the town paper and read by 20 people, but none of them knows the player or is in the player's circle. Nobody can ask the player about it, so no accusation scene is staged. Seen: red the same with and without #9604.

**Cause.** Measured: at Adams, Massachusetts (2500590), seed f54fcb0fe1c46cd2:2, by `npx vitest run src/director/political-asks.test.ts` with a probe on the news.read events. The story printed:outlet:newspaper:0:jurisdiction_86b02c4833138c28:bribe:2025-01-20:person_d72b5fa964872323:...:reported:person_d72b5fa964872323:2025-01-21 is read on 2025-01-28 by 20 readers: 0 in focus and 0 who know the player. The read is not kept (state.ts `retainLog` keeps a read that names the circle), so the player's book holds only the press-story moment and nothing binds `accusation`. The pin was green when written, so the readers moved after a later Train change. Found in code: src/director/political-asks.test.ts line 116, the pinned seed.

**Fix.** Find which Train change moved the paper's readers at this seed (bisect the Train's folds against the probe line). If that change is right, re-pin with a script outside the test that finds a place and seed where a reader who knows the player reads the story, with the old premise stated and the lead's yes. The test also writes the report by hand when the engine does not (line 216): say so in the re-pin.

**Time box.** 2 hours.

**Rules.** Ask why: the accuser read the story by record.

**Done when.** A second session runs the re-pinned test and it is green, and the reader who asks names the news.read by id. In a drawn place, Adams, Massachusetts (seed f54fcb0f:2), the commit that moved the readers is named.

**Waits on.** Nothing.

**Files.** src/director/political-asks.test.ts

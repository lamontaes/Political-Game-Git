---
id: words-primary-challenge-seed
title: "The primary-challenge test builds the world it describes: a party, an open race, a same-party rival"
area: words
kind: bug
priority: 3
size: S
status: done
claimed-by: story/primary-challenge-seed
pr: #8128
blocked-on:
lead: words
milestone: play-first
source: "primary-challenge.test.ts red on main with GOLDEN_PATH_SEED=5: no drawn race had a same-party rival"
claimed-at: 2026-11-10T10:00:00.000Z
merged-at: 2026-11-10T09:38:58.052Z
seen-by: second-session-2
seen-at: 2026-11-11T00:37:42.012Z
---

**What.** A fault in the test's assumptions about the drawn world, not the director's rules or bank. Seed 5, six draws: "the player has no party" four times and "no partisan race two months out" twice. Three assumptions were stale or luck-bound: (1) the creator files no party for a new adult (a tie is the person's own act, parties.ts joinParty), so the player never "had" one; (2) `playerContests` lists only races whose filing is open, and the test looked on the opening day, when none is; (3) with a party and an open race (twelve draws), no same-party rival filed in the weeks waited ("had no rival of the same party" in five of the six places that reached it), because a primary challenge is rare in a drawn world. The test now has the player join the party of the first open partisan race's seat (`joinPartyAs`), lets the weeks pass until a race is open, and, labeled as a hand-made probe, has a resident of the town join the same party and file for the same race after the player; the scene the world then produces is composed and checked as before (the same-party fact cites the cause record, the statement says it is the player's party, other-party rivals carry no such fact).

**Done when.** `GOLDEN_PATH_SEED=<seed> npx vitest run src/director/primary-challenge.test.ts` passes on seeds 5 (Jefferson, West Virginia, 5:1), 17 (Clarkedale, Arkansas, 17:0) and 88 (Union Point, Georgia, 88:1).

**Files.** src/director/primary-challenge.test.ts

**Time box.** 1 hour.

**You will see.** Nothing changes in play.

**Notes.** Seen in the game (2026-11-11, second-session-2): Jefferson WV seed 5; Clarkedale AR seed 17; Union Point GA seed 88, seed 5,17,88, main c330c7fe: primary-challenge.test.ts rerun on current main passed on each of the three named seeds, one test passing each

---
id: words-win-side-proof
title: "The win side plays in a played year: race-won, the morning after, race-told, swearing-in; and the swearing-in journal test follows the journal's rule for kin"
area: words
kind: bug
priority: 3
size: S
status: done
claimed-by: story/director-win-side
pr: #8122
blocked-on:
lead: words
milestone: play-first
source: "the lost candidate years could not show race-won or swearing-in; swearing-in-scene.test.ts was red on seed 72 when the officiant was the player's mother"
claimed-at: 2026-11-10T08:00:00.000Z
merged-at: 2026-11-10T07:36:09.733Z
seen-by: second-session-2
seen-at: 2026-11-11T01:32:30.926Z
---

**What.** Proof, plus one test fix. A player who files, campaigns on the real campaign actions (canvass, raise-money, event, forum, donor-meeting, as src/bench/path-check.ts does) and wins plays the whole win side. Bear Creek, Alaska (seed w3:13): the player, person_b5d3c7657bd8b93f, filed for election-result:contest:seat:gus2025:160739:board:3:2025-10-07 with no rival and won. The director staged, on the player's clock: race-won and family-win (2025-10-07, that count), morning-after (10-08), race-told (10-10, for the count of board:6, through the original row), swearing-in (took-office:seat:gus2025:160739:board:3:2025-10-13), celebration, first-day, first-meeting and advice. race-won, swearing-in and race-told compose. Nothing needed wiring.

The test fix: swearing-in-scene.test.ts expected the journal to print the officiant's full name, but the journal names a relative by relation ("My mother swore me in.", journal.ts `other`) and cites the family fact the relation came from. The test now expects that for kin and the name for anyone else. Red on seed 72 before; green after on the same seed.

**Not proven.** The new race-told row (two days after, for a player who ran) was proven in a lost race (Cleveland, Utah, #8109). The winning run was uncontested and its race-told came from the original row for another count. Winning a contested race as an unknown 18-year-old was rare: eleven drawn races (seeds w1, w2, w3) lost, nine of them with one rival or an incumbent running.

**Done when.** `GOLDEN_PATH_SEED=72 npx vitest run src/director/swearing-in-scene.test.ts` passes; src/director/victory-night.test.ts passes (seed 71, Charlottesville, Virginia).

**Files.** src/director/swearing-in-scene.test.ts

**Time box.** 1 hour.

**You will see.** Nothing changes in play.

**Notes.** Seen in the game (2026-11-11, second-session-2): named seeds 72 (swearing-in) and 71 (victory night, Charlottesville VA), seed 72, 71, main 32a6683b: swearing-in-scene.test.ts at seed 72 and victory-night.test.ts at seed 71 both passed, one test each

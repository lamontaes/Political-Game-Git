---
id: director-tie-grew-turn-missing-for-an-adult-player
title: "A tie that triples in 30 days records no grew turn for a 60-year-old player (tie-turns red at Lyon, Mississippi)"
area: director
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
source: "the opening-draws thread, Nov 16, 2026, while making the new game's player 18 or older"
model: sonnet
effort: medium
root: none
---

**What.** src/director/tie-turns.test.ts fails at Lyon, Mississippi (2842960), seed df9895d1cfdcf4b1c84c6038ae7bcb6d2e641cb3, once the new game's player is one of the town's adults instead of a 17-year-old. The player was born 1964-07-26. Their one contact (person_55eb20b339a40364, a weekly-tier townsperson born 1979) grows from level 0.13 to 0.41 over 30 days of 6 hours a day together. The director's thread for them records no turn at all ("no grew turn after 30 days"). On the code before the change the test passes at the same seed, with a 17-year-old player. Seen: a friendship the player builds over a month never becomes a scene.

**Cause.** Needs cause. Found in code so far: src/director/ledger.ts (about line 1462) pushes a turn only when a moment with a tie channel is recorded, so the change in the tie never cleared the moment floor for this player. Whether the floor or the score reads the player's age, traits or circle size is not yet traced.

**Fix.** None until the cause is found.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice. No threshold picked to pass. One rule, all 56 places.

**Done when.** src/director/tie-turns.test.ts passes at the seed above and at three more drawn places named with their seeds, each with an adult player. The PR names the moment record id the grew turn cites, and the cause by file and line. A second session plays an adult life in a drawn place, spends a month of evenings with one acquaintance, and sees the becoming-friends scene in the running game.

**Waits on.** Nothing.

**Files.** src/director/ledger.ts, src/director/tie-turns.test.ts

---
id: play-golden-path-one-life
title: "The golden-path check plays one life: the player who filed wins their own seat and passes their own bill"
area: play
kind: wiring
priority: 1
size: M
status: claimed
claimed-by: claude/golden-path-one-life
pr:
after:
blocked-on:
source: "audit Oct 19 (docs/reports/audit-2026-10-19.md, Part A 'What it fakes' 1, Part B); acting CTO"
claimed-at: 2026-10-20T04:04:17.858Z
---

**What.** One player, one seed, one drawn place, played as the same person the whole way: turns 18, meets people, files, campaigns, wins, proposes an ordinance, negotiates, it passes, the town changes (another engine reads the law), someone brings it up having learned of it from the news, and the next election reads the record. Today `src/bench/path-check.ts` files and campaigns as the 18-year-old, reads election night, then calls `player.select(holder)` on an already-seated official for steps 6 to 11, so the headline "in 29 of 56 places a new officeholder's law reaches the town" is not one life. `path-check.ts` is changed to refuse any `player.select(...)` switch after step 1 and to count step 5 only on a win (running again if the player loses); the report names the furthest step the player reaches, never a percentage.

**Rules.** Progress is the golden path with the world running: report the furthest step a player reaches, never an audit percentage, and never by switching to a seated official. Ask why: every step answers why by record, from the filing record to the next election's read of the record.

**Done when.** The check runs in a drawn place with `buildBenchWorld` and a seed the builder did not choose, and either reaches step 11 as the same player with every step's record id in the report, or stops at the first failing step and files that step's blocker as a pool item; the old switch-to-holder path in `src/bench/path-check.ts` is deleted and the PR body counts the lines removed; a test under `tests/golden-path/` fails if the player id changes between steps. The owner plays it: he is the person who turned 18, won, and passed the law.

**Files.** src/bench/path-check.ts, src/bench/reached.ts, tests/golden-path/

**Notes.** Sent back to open on 2026-10-20 (merger): merge-main conflict in src/bench/path-check.ts. From the Oct 19 audit. Under it: play-nothing-to-enter-at-eighteen (step 3) and play-step-9-is-a-read (step 9). The unmerged p1 game-stoppers (a small town freezes, the year stops at the first public payday, outlets close in the first weeks) sit in the way and land first.

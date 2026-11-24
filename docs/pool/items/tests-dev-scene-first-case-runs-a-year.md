---
id: tests-dev-scene-first-case-runs-a-year
title: "Dev mode's scenes test runs the world up to a year in its first case and times out at about 370 seconds"
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: play-first
source: "family life builder, Nov 14 2026: seen on the train at 628ff74de779092e3b0f5c46464fb49aa7aaff64 while gating #9160"
model: sonnet
effort: medium
root: none
---

**What.** `src/bench/dev-scene.test.ts`, case "lists every type, forces the one the game can bring about and refuses the rest", fails with `Test timed out in 280000ms` on every draw tried: about 370 s at Wilsonville, Alabama (seed f2f9088ee46a8131) on the clean train 628ff74d, and at Homer, Georgia (seed efb8eeaba615eb83). A case this long also breaks the pinned-tests rule of about a minute per case. Guards: the dev mode Scenes panel, which a second session uses to force a scene when checking any scene in the running game.

**Cause.** Measured: the case's last step forces a "wait" type whose cause is `news.read` (`dev.forceScene({ typeKey: wait!.key })`), and `forceScene` runs the world with `runUntil({ kind, person, cap: input.cap ?? 366 })` in src/bench/dev-mode.ts. Where no news story names the player, the world runs the whole 366-day cap; the run logged `constituent-stop cap after 366 days`. The seed is drawn at random each run (`DEV_MODE_SEED ?? randomBytes`), so it is also red by draw.

**Fix.** Pin the test to named places and fixed seeds in the file (skill `pinned-tests`), and pass a short cap to the wait step (`forceScene({ typeKey, cap: 30 })`): the case checks only that the recipe is `wait` and that the run reports why it stopped, which a 30-day run shows as well as a year. Keep the case's other assertions as they are.

**Time box.** 1 hour for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Pinned tests: the test names its places and seeds in the file and runs in about a minute, never loosening what the case asserts. One rule, all 56 places: the pinned places are drawn from all 56 by drawPlace and named with their seeds in every message.

**Done when.** The test case passes in under a minute at each pinned drawn place, run alone in a cloud container with the place and seed named in its output, and a second session runs the same test on main and sees the same times.

**Waits on.** Nothing.

**Files.** src/bench/dev-scene.test.ts

**Notes.** Filed by the family life builder (thread "Write family life scenes"), Nov 14 2026.

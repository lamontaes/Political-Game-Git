---
id: play-stop-15-family-unexplained
title: "My family is the Steins, I am Bo Snider, and nothing explains who they are"
area: play
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** I made Bo Snider on the v0.22.10 release. The first evening at home shows five people; hovering names John, Paula, Parker and Madison Stein, and nothing on screen says they are my family until I click one ("father"). The People web adds sisters Luna and Elizabeth Stein, grandmother Blair Stein and uncle Brandon Valentine; nobody shares my surname and nothing says why. The fifth person in the room is unnamed. I expected a line on the first night saying who lives with me.

**Rules.** This is a game, not a spreadsheet: the first evening should introduce the household. No hand-written player text: the introduction comes from the English engine from the household records.

**Done when.** The owner does the same steps on the next build and is not stopped: on the first evening the player can tell without clicking who each person in the room is to them, and a surname that differs from theirs is explained or matches. Shown by a screenshot from the installed build in a drawn place, with the place and seed named.

**Files.** src/bench/opening.ts, src/bench/family.ts, src/bench/scene.ts

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md). Release v0.22.10 (4c943f3), Anson, Texas, game seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213. Log 15:52; screenshots 11, 13, 23.

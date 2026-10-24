---
id: play-stop-13-start-a-life-or-new-world
title: "New Game offers Start a life, New world and Custom world with nothing saying which to pick"
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

**What.** On the v0.22.10 title screen, NEW GAME opens a second menu: CUSTOM WORLD, START A LIFE, NEW WORLD, BACK. Nothing says how Start a life differs from New world, or what Custom world changes. A first-time player who wants to play a person has to guess; I guessed Start a life. The title menu also has four dimmed entries (Watch the world, Continue, Saved games, Patch notes) with no reason.

**Rules.** This is a game, not a spreadsheet: the first screen must make the way into a life obvious. No hand-written player text: a one-line description per choice comes from the English engine or control names.

**Done when.** The owner does the same steps on the next build and is not stopped: on the title screen a first-time player can tell in one look which choice starts playing a person, and each dimmed entry says why it is dimmed. Shown by a screenshot from the installed build in a drawn place, with the place and seed named.

**Files.** src/bench/play.html, src/bench/play.mjs, src/bench/title.ts, src/bench/data/controls.json

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md). Release v0.22.10 (4c943f3), Anson, Texas, game seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213. Log 15:47, 15:48; screenshots 01, 02. assigned: Play fixer (CTO, Oct 24; play-first order docs/work-orders/play-first-2026-10-24.md).

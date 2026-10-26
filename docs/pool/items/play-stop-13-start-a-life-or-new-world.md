---
id: play-stop-13-start-a-life-or-new-world
title: "New Game offers Start a life, New world and Custom world with nothing saying which to pick"
area: play
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr: #6092
blocked-on:
source: added with npm run pool -- add
lead: play-first
milestone: play-first
after: play-first-01-start-a-life-first
claimed-at:
---

**What.** On the v0.22.10 title screen, NEW GAME opens a second menu: CUSTOM WORLD, START A LIFE, NEW WORLD, BACK. Nothing says how Start a life differs from New world, or what Custom world changes. A first-time player who wants to play a person has to guess; I guessed Start a life. The title menu also has four dimmed entries (Watch the world, Continue, Saved games, Patch notes) with no reason.

**Rules.** Serves LAW.md §1, Screens and menus; LAW.md §10, The owner's read of the Oct 24 screenshots. This is a game, not a spreadsheet: the first screen must make the way into a life obvious. No hand-written player text: a one-line description per choice comes from the English engine or control names.

**Done when.** The owner does the same steps on the next build and is not stopped: New game shows one button, Start a life, with one Advanced link beneath it that holds the custom and watch world modes, and each dimmed entry says why it is dimmed. Shown by a screenshot from the installed build in a drawn place, with the place and seed named.

**Time box.** 2 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** New game is one button, Start a life (owner, Oct 24). The world modes (custom, watch) sit under one Advanced link beneath it; the custom world is the Oct 14 dev-mode custom start. Every dimmed title entry says why it is dimmed.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/play.html, src/bench/play.mjs, src/bench/title.ts, src/bench/data/controls.json

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md). Release v0.22.10 (4c943f3), Anson, Texas, game seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213. Log 15:47, 15:48; screenshots 01, 02. Ruled (owner, Oct 24, "go ahead"): one button, Start a life; world modes under one Advanced link; Oct 14 dev-mode custom start stands (OWNER-DECISIONS.md, Oct 24; LAW.md conflicts). Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md); was m0-m2. Playtest Oct 26 sitting 1 (installed v0.34.0): Patch notes dimmed on the title with no reason; "Watch the World" still a title entry. Owner: "I don't know why patch notes is grayed out on the main menu."

Sent back 2026-10-25 ~22:25 UTC from PR #6092 (branch play-first/play-stop-13-start-a-life-or-new-world, head 6808a793b7 with main merged in): all three body screenshots are wrapped in backticks so none render as images, and OWNER SCREENSHOT NEEDED still awaits the owner's yes; unwrap the image tags and it goes back in the queue once the owner says yes; finish on that branch, merge main into it first.

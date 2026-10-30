---
id: play-menus-jobs-and-your-life
title: "Jobs and study shows your job on a plate with your work and school as a timeline, and Your life tells your own history"
area: play
lead: cto
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
milestone: play-first
source: owner, Oct 29 (with a screenshot of a History: "this is your character's history... I don't like that at all"; "redesign all the menu screens")
---

**What.** Jobs and study printed the job's title, employer, pay and hours as plain lines and the schools as dated rows, and the player had no screen that told their own life at all, only other people's cards did. The owner asked for every menu to be redesigned like Government with histories as a vertical timeline (Oct 29, 22:45). This item puts the job on a framed plate with its workplace's painting and the title in the name type, shows the player's work and school as a timeline beside it, and adds a Your life tab to Who you are that tells the player's whole history down the same timeline, read from the one history every person's card uses.

**Rules.** Screen to mock: the screen follows `docs/ui/mocks/screens-2026-10-14/shots/jobs.png` and the shared kit parts (plate, timeline), never a one-off renderer. One engine per mechanic: the player's history comes from the same reader as everyone's card (`/api/known`), never a second history. No hand-written player text: every line comes from the English engine's person-history bank and every label from the controls words.

**Done when.** In a drawn place at 1440 by 900, named with its seed, Jobs and study shows the job plate (or no current job) and the player's work and school as a timeline, and Your life shows the player's history from birth as a timeline with an icon per record, both read from `/api/known` for the player, with nothing scrolling; the character browser check passes; screenshots land in `docs/play-first/shots/play-menus-jobs-and-your-life/`.

**Time box.** 2 hours, Opus (CTO).

**You will see.** A Your life tab beside Who you are that tells your own life down a gold timeline, and your job on a framed plate.

**Screenshot.** Jobs and study and Your life at 1440 by 900 from a drawn place.

**Files.** src/bench/play.mjs, src/bench/play.css, src/bench/data/controls.json

**Notes.** Filed by the CTO, Oct 30 03:20, the fifth screen of the menu redesign. Read: OWNER-DECISIONS Oct 29 22:45; Oct 28 (View person shows history); searched the pool: jobs and study, own history, your life (no twin).

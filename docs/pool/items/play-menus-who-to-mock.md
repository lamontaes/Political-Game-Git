---
id: play-menus-who-to-mock
title: "Who you are reads like the Oct 14 mock: your figure framed, your life on plates, your household as face cards"
area: play
lead: cto
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: cto/menus-who
pr: #6857
blocked-on:
milestone: play-first
source: owner, Oct 29 ("redesign all the menu screens... So they're not blocks of text anymore with random buttons")
claimed-at: 2026-10-30T02:05:24.991Z
---

**What.** Who you are drew the player's facts as plates in a two-column grid, the household as plain name buttons, and in any life not started from the creator an empty frame where the player's figure should stand, because the screen looked only for a creator portrait or the player standing in their own scene. The owner asked for every menu to be redesigned like Government (Oct 29, 22:45). This item frames the player's figure like the person card's, puts home, work, school and cash on small plates, the household as face cards that open each person, and the player's views as small plates; Jobs and study keeps the same frame.

**Rules.** Screen to mock: the screen follows `docs/ui/mocks/screens-2026-10-14/shots/who.png` and the shared kit parts (plate, fact plates, member card, pager), never a one-off renderer. No hand-written player text: what you are like stays in plain sentences from the English engine, never trait names (owner, Oct 27), and every label comes from the controls words. Replace, never layer: the old name-button household and grid sections are deleted.

**Done when.** In a drawn place at 1440 by 900, named with its seed, Who you are shows the player's figure in its frame for a life started from Advanced as well as the creator, the small plates, the household as face cards that open each person's card, and the views as plates, with nothing scrolling; the character browser check passes; screenshots beside the mock land in `docs/play-first/shots/play-menus-who-to-mock/`.

**Time box.** 2 hours, Opus (CTO).

**You will see.** Your own figure standing in a framed plate, your home, school and money on small plates, and your family as faces you can click.

**Screenshot.** Who you are before and after at 1440 by 900 from a drawn place, beside the mock.

**Files.** src/bench/play.mjs, src/bench/play.css, src/bench/ui/screen.mjs

**Notes.** Filed by the CTO, Oct 30 02:45, the fourth screen of the menu redesign. Read: OWNER-DECISIONS Oct 29 22:45 and 23:00; Oct 27 (plain sentences, never trait names); searched the pool: who you are, character screen (no twin).

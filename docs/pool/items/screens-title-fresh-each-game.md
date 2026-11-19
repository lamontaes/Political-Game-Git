---
id: screens-title-fresh-each-game
title: "The title and New game start fresh each game, and loading shows the player's state"
area: play
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: screens lane (Nov 16)
pr: 9768
blocked-on:
source: owner, Nov 16, crew line item 4d and his Desk answer on title paintings
after:
lead: play-first
model: opus
effort: medium
root: none
---

**What.** The title opened on the same painting every launch of a day, showed only six paintings repeated to twelve frames, and New game always pictured the same four faces. Loading showed the title's monument, not the player's state. The owner said "each game, it should start with new ones."
Seen: two launches of the bench on one day opening on the same painting.

**Cause.** Found in code: `src/bench/title.ts` line 50, `dayNumber`, started the rotation from the calendar day and a visit count that resets each launch, and dealt each monument's paintings turn by turn so one-painting monuments repeated; `newGameFaces` in `src/bench/appearance.ts` took no seed.

**Fix.** Seed `titleRotation` in `src/bench/title.ts` with a seed drawn at launch and the visit, play every monument painting once, and pass the same seed to `newGameFaces`; give loading the player's state capitol through `stateCapitolPicture` in `src/bench/creator.ts`. The player sees it on the title, New game and the loading card.

**Time box.** 2 hours for one session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Replace, never layer: the day-based start and the turn-by-turn repeats are deleted. One rule, all 56 places: loading reads each state's capitol from data, with the shared dome or tower where a state has none painted.

**Done when.** A second session opens the title twice and sees two different paintings and New game faces, then starts a life in a drawn place and sees its state's capitol behind the loading card.

**Waits on.** Nothing.

**Files.** src/bench/title.ts, src/bench/title.test.ts, src/bench/appearance.ts, src/bench/creator.ts, src/bench/handler.ts, src/bench/play.mjs, src/bench/title-fresh.browser.mjs

**Notes.** Crew line #9747, item 4d. Whether the four protest-at-the-Capitol paintings belong in the rotation (they would make 15) is asked of the CTO.

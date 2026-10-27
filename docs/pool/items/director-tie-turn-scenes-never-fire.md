---
id: director-tie-turn-scenes-never-fire
title: "A tie that grows, sours or comes back stages no scene in a played year: becoming-friends, argument and reunion never fire"
area: director
kind: bug
priority: 1
size: M
status: in-pr
claimed-by: claude/director-tie-turn-scenes
pr: 6335
blocked-on:
source: "words-and-scenes lead, Oct 27: the scene web's meeting-people pass"
lead: director
milestone: play-first
claimed-at: 2026-10-27T14:06:10.958Z
---

**What.** Three situation types fire on a relationship thread's turn: `becoming-friends` (a tie grew), `argument` (a tie soured) and `reunion` (a tie's re-entry). None of them fired in a played year in either drawn place the scene web ran, with the player, their household and every official who is a full person watched. The places are New Britain, Connecticut (seed `web-morning-1`) and Charlotte Amalie East, U.S. Virgin Islands (seed `web-meeting-1`). The owner's "meeting people" season is the quietest stretch of the game for it. Either no watched thread turns in a year, or the turn is never matched to the type.

**Rules.** Ask why: name, by record, why no scene fired: no turn recorded, or a turn with no match. No dice: a friendship scene fires from the thread's own turn, never a timer. One rule, all 56 places: a third drawn place confirms it.

**Done when.** In a buildBenchWorld drawn place with its seed named, a played year with the player watched lists every thread turn the director recorded for the watched people (`grew`, `soured`, `renewed`) by record id. Each turn either stages its type, or the test names why it doesn't. A test fails when a recorded `grew` turn for the player stages no `becoming-friends` scene.

**Time box.** 3 hours.

**You will see.** Someone the player keeps running into becomes a friend in a scene, and a falling-out with a neighbor plays as an argument.

**Screenshot.** The becoming-friends scene in the bench, from a drawn place.

**Files.** src/director/scheduling.ts, src/director/ledger.ts, src/director/data/situation-types.json

**Notes.** The words for these types and their real-life packets are on main: `introduced-at-a-civic-event` and `neighbors-fall-out-over-a-vote` in `docs/design/scenes/from-life/`. Evidence: `npm run scene-web` reports for both seeds.


Update (words lead, Oct 27, 16:50 UTC): with the circumstance producer on main, `becoming-friends` fired 14 times in a played year in Fort Kent, Maine (seed `home-news-1`, `npm run scene-web`). `argument` and `reunion` still fired 0 times there. The item stands for the soured and re-entry turns.

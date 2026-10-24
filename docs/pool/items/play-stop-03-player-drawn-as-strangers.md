---
id: play-stop-03-player-drawn-as-strangers
title: "The game never draws the character I made, and draws me as a different person in each scene"
area: play
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In the v0.22.10 creator I built a blonde, average-build woman in a burgundy top and gray pants, and the Who you are screen shows her. In play the figure named Bo Snider is someone else every time: a girl with braids in a gray hoodie in my bedroom (look-009, heavy build), a woman in an apron with coffee (look-022) the next week, and a redhead in a denim jacket in the café (the same look as the city secretary Eden Rivera). On the first evening at home I am not in the room at all. The talk box shows my portrait next to the other person's name. I expected to see the character I made in every scene.

**Rules.** Wire to the world: the appearance chosen in the creator is a record that the scene and talk screens must read for the player every time. Replace, never layer: one appearance per person, not a fresh draw per scene.

**Done when.** The owner does the same steps on the next build and is not stopped: after making a character in the creator, every scene in the first month (home, bedroom, filing office, door knocking, a director moment) draws that same look for the player, and the talk box shows the other person's portrait. Shown by a screenshot from the installed build in a drawn place, with the place and seed named.

**Files.** src/bench/appearance.ts, src/bench/scene.ts, src/bench/whole-figures.ts, src/bench/creator.ts

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md). Release v0.22.10 (4c943f3), Anson, Texas, game seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213. Log 15:52, 16:00, 16:05, 16:08; screenshots 08, 11, 20, 36, 43, 52, 58.

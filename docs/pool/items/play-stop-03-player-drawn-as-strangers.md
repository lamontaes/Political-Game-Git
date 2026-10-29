---
id: play-stop-03-player-drawn-as-strangers
title: "The game never draws the character I made, and draws me as a different person in each scene"
area: play
kind: bug
priority: 1
size: S
status: done
claimed-by:
pr: #5898
blocked-on:
source: added with npm run pool -- add
lead: play-first
milestone: play-first
after: play-first-05-v1-figures-removed
claimed-at:
---

**What.** In the v0.22.10 creator I built a blonde, average-build woman in a burgundy top and gray pants, and the Who you are screen shows her. In play the figure named Bo Snider is someone else every time: a girl with braids in a gray hoodie in my bedroom (look-009, heavy build), a woman in an apron with coffee (look-022) the next week, and a redhead in a denim jacket in the café (the same look as the city secretary Eden Rivera). On the first evening at home I am not in the room at all. The talk box shows my portrait next to the other person's name. I expected to see the character I made in every scene.

**Rules.** Serves LAW.md §2, People in rooms and figures; LAW.md §10, The owner's read of the Oct 24 screenshots. Wire to the world: the appearance chosen in the creator is a record that the scene and talk screens must read for the player every time. Replace, never layer: one appearance per person, not a fresh draw per scene.

**Done when.** The owner does the same steps on the next build and is not stopped: after making a character in the creator, every scene in the first month (home, bedroom, filing office, door knocking, a director moment) draws that same look for the player, and the talk box shows the other person's portrait. Shown by a screenshot from the installed build in a drawn place, with the place and seed named.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** In the bedroom, at the city secretary and at the doors, the figure named as you is the one you made in the creator, and the talk box shows the other person's face.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/whole-figures.ts, src/bench/appearance.ts, src/bench/scene.ts, src/bench/creator.ts, src/bench/play.mjs

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md). Release v0.22.10 (4c943f3), Anson, Texas, game seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213. Log 15:52, 16:00, 16:05, 16:08; screenshots 08, 11, 20, 36, 43, 52, 58. Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md); was m0-m2.

CTO, Oct 25 18:20 UTC: fixed on main by #5898 (merged); the owner's installed-build check closes it.

Oct 29 (CTO): set done; PR #5898 merged (the done flip failed while branch protection refused the flip job's push).

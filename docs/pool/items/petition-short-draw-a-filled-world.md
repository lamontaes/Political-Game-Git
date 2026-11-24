---
id: petition-short-draw-a-filled-world
title: "The petition-short test draws a world where volunteers fill the petition by themselves"
area: director
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: story
model: sonnet
effort: medium
root: none
source: CTO, Nov 19 00:38Z on the Story thread (issue 9750): no re-pin; draw the world and print each place passed over
checked:
---

**What.** Two cases of `src/director/petition-short.test.ts` show that a petition volunteers fill on their own is never told short, and that dev mode traces the clerk's offer. Both pin one world, seed `scan-1`, found by a script outside the test. On the cut that world no longer fills by volunteers. Seen: dev mode's "petition behind" control and a filer whose volunteers carry the petition.

**Cause.** Measured: on the cut (#10063, head 1edbbe80e0) both cases fail at `scan-1` ("nothing told: expected '2025-08-03' to be undefined"), shown by `npx vitest run src/director/petition-short.test.ts`. The same seed passes on train/nov17b. Scenes that compose write outcome records, so which scenes have lines changes who volunteers in a pinned world. The owner's rule is that tests draw their places (`drawn-place-tests`).

**Fix.** The two cases draw seeds of the town until they find a world where volunteers fill the petition by themselves (the petition's `signed` reaches what it must gather by its due date with no act of the player's), and print each seed passed over and why. The dev-mode case draws a world the clerk tells. Then take off both `it.fails` marks.

**Time box.** 2 hours.

**Rules.** Tests draw their places: never a pinned seed, and every place passed over is named in the output. No dice: the volunteers come from the campaign engine's records, never a roll the test adds.

**Done when.** A second session runs `npx vitest run src/director/petition-short.test.ts` on main twice, each time in a drawn place and seed nobody chose, sees both cases pass with their `it.fails` marks off, and reads the places passed over in the output.

**Waits on.** Nothing.

**Files.** src/director/petition-short.test.ts

**Notes.** Nov 19 (Story): filed on the CTO's ruling; both cases carry `it.fails` naming this item on #10063.

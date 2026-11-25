---
id: petition-short-other-worlds-case-takes-ten-minutes
title: "The petition-short test's other-worlds case plays twelve towns and takes over ten minutes in one case"
area: elections
kind: cleanup
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: elections
model: sonnet
effort: low
root: none
source: Account lead, petition-short trace, Nov 16, 2026 (lead's note on #9716)
---

**What.** One test case in src/director/petition-short.test.ts, "other worlds show the other wordings of the clerk's and the helper's talk", takes 632 seconds alone and 624 seconds beside another file, with a limit of 1,300 seconds. It plays twelve worlds of one town: four clerk seeds and two helper seeds, each once with nothing signed and once with some names signed, and each world plays about 100 days of the town before the clerk or helper tells the player. Its job is to write every wording of the talk to the played file, and the same wordings could be written by fewer worlds. Seen: 632 s alone and 624 s beside, Train a2cbd213.

**Cause.** Measured: `npx vitest run src/director/petition-short.test.ts --reporter=verbose` at Sherrodsville OH (place key 3972242) on Train a2cbd213 shows the case at 631638 ms alone; the loop over CLERK_SEEDS and HELPER_SEEDS inside it calls `filer` and then `told` for each seed twice, so each of the twelve calls builds a world and plays to the day the record is written, and nothing in the case needs twelve worlds.

**Fix.** Find out how many worlds are needed to show every wording the case is there to show: replay the twelve, list the opener, lead, answer and thank wordings each one printed, and keep the fewest worlds that cover the same set (the told day is the same, so the play can also be shared by the nothing-signed and some-signed runs of one seed by branching after the told day). Keep the case under about three minutes, move the rest to the played-file script if it only exists to write the file, and say in the PR how many worlds it keeps and which wordings each one covers.

**Time box.** 3 hours for one Sonnet session.

**Rules.** Speed (owner, Oct 29): a check that plays a hundred days of twelve towns for one set of wordings is slower than the thing it checks needs, so it plays only the worlds that show a different wording.

**Done when.** A second session runs petition-short.test.ts alone on main at Sherrodsville OH (place key 3972242) and sees the other-worlds case under three minutes with the same set of wordings written to the played file as before.

**Waits on.** #9716 (the case's seeds are moved there).

**Files.** src/director/petition-short.test.ts (new)

**Notes.** Account lead, Nov 16. Asked for by the lead as an item, not part of #9716.

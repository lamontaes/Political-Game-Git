---
id: words-season-variety-thin-circle
title: "A campaign season holds three kinds of scenes even when the player knows few people"
area: play
kind: feature
priority: 2
size: M
status: claimed
claimed-by: claude/pool-words-season-variety-thin-circle
pr: #8490
blocked-on:
source: added with npm run pool -- add
after:
lead: director
standard: 2
model: sonnet
effort: medium
root: rc6-scenes-repeat
checked: fable 2026-11-10
claimed-at: 2026-11-11T02:38:31.740Z
branch: claude/pool-words-season-variety-thin-circle
---

**What.** src/director/campaign-season.test.ts asks that at least three of the season's kinds fire (an offer to help, word of a rival's campaign, an interview, a debate, a rival filing). In Ontario, Indiana (seed 0079b51fd8a9bc5bba59:0) the player knew ten people, so nobody offered to help; no rival bought ads and no outlet held a debate, so only a rival filing and the interview fired from January to November. Counting journal lines (words/red-campaign-season) fixes towns like Northford, Connecticut, but not a thin circle. The plan's step 6 scenes (door-knocking as porch scenes, the campaign team) and the manager offer (#6812) are the producers that fill it.

**Cause.** Measured: src/director/campaign-season.test.ts at Ontario, Indiana, seed 0079b51fd8a9bc5bba59:0: the player knew ten people, so no one offered to help and only a rival filing and the interview fired from January to November; also Pineland, Florida (seed chk2-b:0) failed the first beat on main (Oct 30).

**Fix.** Add season kinds that read records an engine already writes (a door knocked, a staff offer, a donor called) so a small circle still has three kinds fire; a smaller circle means fewer offers, never a season with none.

**Time box.** 5 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: each added kind is a read of a record an engine already writes (a door knocked, a staff offer, a donor called), never a typed beat. No dice: whether a scene stops the day stays the director's weight; journal lines count as fired. Sliding scales: a smaller circle means fewer offers, never zero season.

**Done when.** A second session, not the builder, runs src/director/campaign-season.test.ts on Ontario, Indiana (seed 0079b51fd8a9bc5bba59) and on five fresh drawn places (named with their seeds) and sees at least three season kinds fire in each, each kind named by the record that fired it.

**Waits on.** Nothing.

**Files.** src/director/campaign-season.test.ts, src/director/data/situation-types.json, src/core2/modules/campaigns.ts, data/english/parts/scene-talk.json

**Notes.** lead: words. Found Oct 29 while fixing the Northford seed red.

Oct 30 (Words): more evidence, a first-beat gap: Pineland, Florida (seed chk2-b:0) failed campaign-season's first beat on main. Related: most of the people the player knows at the start are husks, and a talk with one opens empty (words-talk-husk-acquaintances-empty), which thins the circle a season can cast from.

Claimed by next for sonnet-a266 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 02:38 UTC) on branch claude/pool-words-season-variety-thin-circle.

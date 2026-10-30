---
id: words-season-variety-thin-circle
title: "A campaign season holds three kinds of scenes even when the player knows few people"
area: play
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/director/campaign-season.test.ts asks that at least three of the season's kinds fire (an offer to help, word of a rival's campaign, an interview, a debate, a rival filing). In Ontario, Indiana (seed 0079b51fd8a9bc5bba59:0) the player knew ten people, so nobody offered to help; no rival bought ads and no outlet held a debate, so only a rival filing and the interview fired from January to November. Counting journal lines (words/red-campaign-season) fixes towns like Northford, Connecticut, but not a thin circle. The plan's step 6 scenes (door-knocking as porch scenes, the campaign team) and the manager offer (#6812) are the producers that fill it.

**Rules.** Wire to the world: each added kind is a read of a record an engine already writes (a door knocked, a staff offer, a donor called), never a typed beat. No dice: whether a scene stops the day stays the director's weight; journal lines count as fired. Sliding scales: a smaller circle means fewer offers, never zero season.

**Done when.** src/director/campaign-season.test.ts passes on five fresh drawn places with their seeds named and on Ontario, Indiana (seed 0079b51fd8a9bc5bba59), with at least three season kinds fired in each, each kind named by the record that fired it.

**Files.** src/director/campaign-season.test.ts,src/director/data/situation-types.json,src/core2/modules/campaigns.ts,data/english/parts/scene-talk.json

**Notes.** lead: words. Found Oct 29 while fixing the Northford seed red.

Oct 30 (Words): more evidence, a first-beat gap: Pineland, Florida (seed chk2-b:0) failed campaign-season's first beat on main. Related: most of the people the player knows at the start are husks, and a talk with one opens empty (words-talk-husk-acquaintances-empty), which thins the circle a season can cast from.

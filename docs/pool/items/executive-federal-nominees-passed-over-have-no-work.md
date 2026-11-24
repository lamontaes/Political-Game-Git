---
id: executive-federal-nominees-passed-over-have-no-work
title: "The President's cabinet nominees who are passed over live in a town and hold work"
area: gov
kind: bug
priority: 2
size: S
status: merged
standard: 2
root: none
claimed-by:
pr: 9485
after: people-far-fill-in-holds-home-work
blocked-on:
lead: governing
source: "Civic roles builder, Nov 15, building executive-governor-pick-offers-the-state"
model: sonnet
effort: medium
---

**What.** For each federal cabinet post the President's nominee is drawn from a field of three, and all three are made full people of the played state. Those people live at the state itself rather than in any town, and they hold no work. The two who are passed over stay full people, and they rank near the top of a player governor's list for every open post (four of the top eight at Edgar, Wisconsin, seed edgar-petition-1). Because they hold no work, they nearly always say yes. Seen: the office panel's list for an open state post, and their answer when asked.

**Cause.** Found in code: `nominate` in src/core2/modules/succession.ts (line 190) seats each of the three through seatOfficial with `stateKey` as their place and no home town or work. The ones not chosen are kept with `ended` set and `seated: false`.

**Fix.** Draw each nominee's home where the state's people live (drawStateHome in src/core2/places.ts), and fill them in there with the work their home town shows (workFromHome), as the state's own cabinet candidates are filled in.

**Time box.** 2 hours for one session.

**Rules.** No dice: homes come from where the state's people live. One model, two tiers. One rule, all 56 places.

**Done when.** A second session, in a drawn place named with its seed, opens a passed-over federal nominee and sees the town they live in and the work they hold.

**Waits on.** nothing.

**Files.** src/core2/modules/succession.ts, src/core2/modules/officials.ts

**Notes.** Filed by hand by the civic roles builder.

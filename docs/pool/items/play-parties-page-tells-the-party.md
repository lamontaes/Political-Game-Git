---
id: play-parties-page-tells-the-party
title: "The Parties page tells who chairs a party, how many members it has here, when it meets next and what it stands for"
area: play
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by: claude-places-and-names
blocked-on:
after:
lead: play
model: sonnet
effort: medium
root: none
source: Owner, Nov 16, 2026 playtest ("I can't learn about these parties"), crew line #9995, stop 19
---

**What.** The Parties page listed each party and the offices it holds, and nothing else about it. A player who wanted to know what a party was, who ran it here, whether it was big and when it met could not find out. Seen: owner playing, Nov 16, on Politics, then Parties. Seen: Politics, Parties, the chosen party's page.

**Cause.** Found in code: the page in `src/bench/play.mjs` (`parties`) read only `v.parties`, the seats a party holds. The records already hold the rest: the chair (`PartyRow.leaderId`), the members (`partyMemberIds`), the next committee meeting (the party module's calendar work) and each party's position on every platform question (`partyPosition`).

**Fix.** `governmentView` carries `partyFacts` for each party, built in `src/bench/government.ts` from those records; the page shows the chair as a person card that opens, the members here, the next meeting and the six questions it takes the strongest side on, worded by the bill catalog's names. A field the records do not hold says so in a control name.

**Time box.** 2 hours for one Sonnet session at medium effort.

**Rules.** Wire to the world: the page reads the parties module and the campaign stances, so every party in every place has its own page. No dice: positions sort by strength, then by name.

**Done when.** In drawn places and seeds the builder did not choose, each party's facts match its records (`src/bench/party-page-facts.test.ts`); a second session opens Politics, Parties in Grano, North Dakota (place key 3832580) and reads each party's chair, members, next meeting and positions.

**Waits on.** Nothing.

**Files.** src/bench/government.ts, src/bench/play.mjs, src/bench/data/controls.json, src/core2/modules/parties.ts, src/bench/party-page-facts.test.ts

**Notes.** New control names for Story to sign: partyAbout, partyChair, partyNoChair, partyMembers, partyNextMeeting, partyNoMeeting, partyStandsFor, partyFavors, partyOpposes, partyNoPositions. Not shown because the records do not hold it: what a party's own platform document says; the bill catalog's name "Statehood for dc" has a lowercase DC (Story's data).

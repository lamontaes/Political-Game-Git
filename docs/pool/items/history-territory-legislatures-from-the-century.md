---
id: history-territory-legislatures-from-the-century
title: "The territories' partisan legislatures on day one are the century's"
area: elections
kind: feature
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/history-territory-legislatures
pr:
after: history-state-places-from-the-century
blocked-on:
lead: elections
model: opus
effort: high
root: rc1-world-outside-town
source: CTO lines 6935086070 and 6936902133 on #9747 (family 3, pins voting.ts:6859 and offices-holder-parties.ts:34); History's PR 3b body (#9883), "Left for PR 3c"
checked:
---

**What.** Guam's, the Virgin Islands', American Samoa's and the Northern Marianas' legislatures have no party record, so every world seats them at large with no party, and the century leaves them out.
Seen: `data/research/offices/legislature-party-counts-2026.json` lists them under `missing`; `electorate-century.ts` `nationalChamber` counts no chamber without published parties.

**Cause.** Found in code: `src/core2/electorate-century.ts:770` `nationalChamber` reads the roster's parties, which Open States does not publish for the four territories; `openingLegislatures` opens a place with no presidential vote at the neutral point.

**Fix.**

1. Add the four territories' published parties (the 2024 elections as seated in 2025, each chamber's own source, marked estimate) to the roster file.
2. The century then counts Guam's, the Virgin Islands' and the Northern Marianas' Senate on the national sides, and keeps American Samoa's Fono and the Northern Marianas' House as play reads them.
3. A place with no presidential vote opens its legislative districts around its delegate seat's 1925 lean (`placeOpeningLean`, stopgap SG-HIST-century-territory-opening-lean).

**Time box.** 1 hour for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** One rule for all 56 places; no dice; research sets the roster, the century sets the outcome.

**Done when.** A second session starts a new game in a territory with a partisan legislature (Guam, the Virgin Islands or the Northern Marianas), writes down the place and seed, turns dev mode on, opens Politics, Metrics, and sees "The state legislature on day one" give the territory's chamber by party from the century. At drawn worlds the three chambers are elected through the century and differ between worlds, and src/core2/electorate-century-legislatures.test.ts passes.

**Waits on.** history-state-places-from-the-century (#9969), which this branch is stacked on.

**Files.** data/research/offices/legislature-party-counts-2026.json, src/core2/electorate-century.ts, src/core2/data/stopgaps/hist.json, src/core2/electorate-century-legislatures.test.ts

**Notes.** Filed by the History lane, Nov 17, 2026. Play still does not race a territory's legislative seats after day one (SG-GOV-territory-legislature-race, voting.ts:6859): a territory has no counted places in play. That is the territories' people (family 5).

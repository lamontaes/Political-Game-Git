---
id: words-donor-ask-scene
title: "A donor's gift is a record, and the donor comes to the candidate asking for something back"
area: words
kind: wiring
priority: 1
size: S
status: done
claimed-by: finisher/words-donor-ask-scene
pr: #6381
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The donor-ask scene (situation-types.json) waits on a campaign-contribution record nobody writes, so a donor never comes back to the candidate. The campaigns engine moves a gift through the journal and keeps the donor's running total, but writes no core record the director reads. Make each gift from someone other than the candidate a public record naming the candidate and the donor, the amount, and its share of what the campaign has raised, plus the pending bill before the seat's body the donor holds the strongest view on, when there is one. The director sizes the moment by that share, and the donor-ask scene fires from it with the donor as the one who comes in.

**Rules.** Wire to the world: the gift record is read by the director and the scene, by record id. No dice: which bill the donor raises follows the donor's own views on what is pending, never a roll. Sliding scales: the moment's size follows the gift's share of the campaign's money, with no threshold of its own.

**Done when.** src/director/donor-ask-scene.test.ts in the played world (buildBenchWorld), on places drawn from all 56 with a seed the builder did not choose, shows each campaign-gift record that was a moment for a watched candidate firing their donor-ask scene with the donor cast as the donor, composed in the lines that play, with the money fact citing the record and, where the record names a bill, a statement naming it.

**Files.** src/core2/modules/campaigns.ts, src/director/data/situation-types.json, src/director/data/director.json, src/director/purpose-scene.ts, data/english/parts/scene-talk.json

**Notes.** TODO

Evidence (words lead, Oct 27): the packet `docs/design/scenes/from-life/the-donor-who-wants-something.md` (local cases in Gilbert, Arizona and Prince George's County, Maryland, calibration only). The `gifts` table names the donor (`donorId`, `totalMinor`) but no event is emitted and no gift is tied to a matter the donor cares about; the legislature keeps no recusal record and reads no gift.

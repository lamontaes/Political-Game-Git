---
id: elections-county-race-sees-only-the-town
title: "A county race is contested and voted by the played town's own people only, so county seats go uncontested 92 percent of the time"
area: elections
kind: bug
priority: 2
size: S
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on: elections-county-race-sees-only-the-town-part-1-seeded-county-tail, elections-county-race-sees-only-the-town-part-2-weigh-the-tail, elections-county-race-sees-only-the-town-part-3-refit-the-weight
lead: governing
model: sonnet
effort: low
root: design-one-model-two-tiers
source: added with npm run pool -- add
claimed-at:
checked: fable 2026-11-10
---

**What.** A county seat in the played world is seated in the town, its electorate is the town alone and only the town's adults weigh running for it. In Mallard Bay, Oklahoma (4045930, draw a63ad2af1003c7ad:5) its nine county races (board, assessor, clerk, prosecutor, sheriff, treasurer) were each weighed by the same 102 named adults and 149 counted records, and each drew one candidate. Over 24 drawn places 161 of 175 county contests had one candidate or none; BallotReady counts 66 percent of county legislative and 74 percent of sheriff races uncontested in 2020 (https://organizations.ballotready.org/research/nothing-to-lose-uncontested-races-in-2020-and-their-implications), reported as a check, not a target. Step A (the whole county votes) is merged; step B (challengers from the rest of the county) failed and is set aside. The rest of the county, which the electorate engine already counts coarsely for statewide races, still does not weigh running for its own county's seats.

**Cause.** Measured: over 24 drawn places 161 of 175 county contests had one candidate or none (Mallard Bay, Oklahoma 4045930, seed draw a63ad2af1003c7ad:5). Found in code: step B on governing/county-challengers gave no runners because no counted record clears the stay-out bar in `weighContest` (`src/core2/modules/candidacy.ts` line 880), and `candidacyCountywideWeight` lowers it a further 0.5 (line 544).

**Fix.** Generate the county's people like each counted record with their own seeded temperament (generation of who exists), weigh only as many as a seat's tail needs, fill one in as a full person when drawn to run, then refit or remove `candidacyCountywideWeight`. The three parts are listed in Waits on.

**Time box.** 2 hours for one Sonnet session, the closing check after the parts. When it runs out, write what was seen in the item and stop.

**Rules.** One model, two tiers: the rest of the county is counted on the same engine as the town's counted residents (re-placed records weighted to the county's eligible voters, as countPlaces does), never a second model. No dice: a challenger from elsewhere in the county runs on the same chooser's reasons; real shares check totals only. Two-level population: a challenger from the rest of the county is filled in as a full person only when drawn to run, seeded so the same person returns. One rule, all 56 places: county facts come from data. Replace, never layer: the countywide weight is refit or removed once the county itself weighs its seats.

**Done when.** A second session plays a world in at least six places drawn from all 56 (names and seeds printed) and finds a county contest's result counting the rest of the county's voters by place record id, and at least one county contest drawing a candidate who lives elsewhere in the county, filled in from the counted rest of the county. It reports the pooled share of county contests with one candidate or none beside the real figure, and a test fails when the rest of the county is removed. If a stopgap row for the town-only county race exists in src/core2/data/stopgaps (none was found on Nov 10), it is deleted.

**Waits on.** Its three parts: elections-county-race-sees-only-the-town-part-1-seeded-county-tail, elections-county-race-sees-only-the-town-part-2-weigh-the-tail, elections-county-race-sees-only-the-town-part-3-refit-the-weight.

**Files.** src/core2/race-places.ts, src/core2/modules/candidacy.ts, src/core2/modules/voting.ts, src/core2/modules/offices.ts, src/core2/data/candidacy/parameters.json

**Notes.** Filed by Lane 1, Nov 4 (unit 5). Design and stopgap registration on governing/county-challengers.

Nov 4, 11:40 (Lane 1): step A merged as its own item (`elections-county-race-county-votes`): a county race is voted by the whole county. Step B, built on `governing/county-challengers` at df3dcf3cf9, does not work and is set aside. The rest of the county was given runners in proportion from the town's counted records (each standing for the county's people like them), weighed by the same counted reasons. In Pigeon Falls, Wisconsin and Mulford, Colorado (run seed ccb-1) no counted record clears the stay-out bar even for a town seat (strongest pulls 3.03 and 3.41 against 3.94), and a county seat is 0.5 lower (candidacyCountywideWeight), so scaling by the county's size gives no one: a few hundred records can't stand for the tail of a county of tens of thousands, where challengers come from. src/core2/county-race-challengers.test.ts failed on all four drawn places with a county. Next design: generate the county's people like each record with their own seeded temperament (generation of who exists), weighing only as many as a seat's tail needs, and refit or remove the countywide weight once they do. Bigger than one 400-line step; the stopgap stays registered on main.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would generate the whole county's people so county seats are contested 70 percent of the time, not 92; a player cannot tell, and local races are in band.

---
id: elections-petition-circulators-cost-vs-new-player-cash
title: "A new player's money buys about forty paid signatures; a statewide or county petition is short by hundreds"
area: elections
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after: elections-petition-circulators-scene
blocked-on:
lead: elections
model: opus
effort: medium
root: none
source: Account lead, Nov 16 01:47Z: in no world found for the circulators scene does the hire close the gap
---

**What.** In every played world with voters outside town, the hire lands the player short. Newry SC: $474 free buys 42 outside names, 225 of 2,451 signed. Kingston RI (governor): $359 buys 40, 548 of 1,000. Ashaway RI (governor): no free money at all, 416 of 1,000 by doors alone. McKinney KY is past the count already.

**Cause.** Found in code and the played record (src/director/petition-circulators.test.ts, played file): `circulatorShift` pays `unitPrice(api, "petition-signature")` a name (about $9 to $11 in these worlds) from `circulatorFundMinor`, and `hireCirculators` sets aside only `freeMinor(campaign)`. A new player's free cash at the told day is $0 to $474; the gap to `signaturesToGather` is 450 to 3,450 names, so the money needed is about $4,000 to $39,000, 10 to 80 times what they hold. `canAddByCanvass` (a shift a day, 900 over 50 days at Newry) is the only other source, and it works in-town voters only. Nothing is wrong in the arithmetic; the open question is whether a new player at a statewide or county race should be able to file at all on their own cash, or whether the filing fee, a petition in lieu of one, or the price row is mis-sized against the real cost of a ballot line.

**Fix.** Trace the real cost of a county or statewide ballot petition against the `petition-signature` row and the opening cash of a new player (ESTIMATED rows with a source), then either resize the price row or the opening cash from the source, or have the filing check name which races a new player cannot afford. No cap, no new mechanic.

**Time box.** 4 hours.

**Rules.** Estimate, never UNKNOWN; every number in a parameter table, tagged; research calibrates, it adds no step to the player's life.

**Done when.** A second session plays Newry SC and Kingston RI from the circulators test's worlds and the record names, by id, what the hire buys against what the petition needs, with the sourced price and opening-cash rows cited.

**Files.** src/core2/data (campaign-unit-prices), src/core2/modules/campaigns.ts

**Notes.** Found by the circulators thread (item elections-petition-circulators-scene). The scene promises nothing: no line says the hire will be enough.

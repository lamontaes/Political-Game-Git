---
id: law-reach-a-targets-only-the-towns-people
title: "The first law-reach group picks only people living in the town for state and federal laws"
area: laws
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after: law-medicaid-record-keeps-only-the-towns-own-jurisdiction
blocked-on:
lead: laws
source: Laws thread's list of town-only law-reach handlers, made with the Medicaid fix on the Account lead's ruling of Nov 16, 2026
model: sonnet
effort: medium
root: none
---

**What.** The first law-reach group picks only people living in the town for state and federal laws. The households the coverage engine bills in the places around the town, in its state, have cash accounts and bills, but this law never reaches them, though a state or federal law's rule reaches named people in the state's other places as well. Seen: dev mode's person card ("laws") for a person outside the town, and the law's reach on its bill card.

**Cause.** Found in code: src/core2/law-reach/group-a-records.ts `townPeople` (line 260) keeps only people whose `placeId` is the town. `targetsOf` (line 424), `townAdults` (line 363) and `scheduleAgeChecks` (line 574) read it for every law, whatever its level.

**Fix.** `targetsOf` and `scheduleAgeChecks` read the people of `townStatePlaces(...)` (group-b-people.ts) for a state or federal law, and the town alone for a town ordinance. `townAdults` stays the town's, as the base of the town's own share. Each payment is recorded as applied under the law's id, so `lawReach` and the person card show it. Reuse the Medicaid fix's place list; add no second list.

**Time box.** 3 hours for one Sonnet session at medium effort.

**Rules.** One rule, all 56 places: the places reached come from the residents runtime's records, never a named state. Every effect can be triggered and traced in dev mode: the person card shows the law on a person outside the town.

**Done when.** A second session, in dev mode at a drawn place from all 56, opens a person billed outside the town who qualifies and sees the law on their card with its payment, by record id. It then ends the law in dev mode, advances a month, and sees the payment stop.

**Waits on.** law-medicaid-record-keeps-only-the-towns-own-jurisdiction (its place list).

**Files.** src/core2/law-reach/group-a-records.ts

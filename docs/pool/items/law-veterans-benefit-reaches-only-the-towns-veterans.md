---
id: law-veterans-benefit-reaches-only-the-towns-veterans
title: "Veterans' benefits pay only veterans in the town, not those in the places around it"
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

**What.** Veterans' benefits pay only veterans in the town, not those in the places around it. The households the coverage engine bills in the places around the town, in its state, have cash accounts and bills, but this law never reaches them, though the benefit is federal, so a veteran in a neighboring place draws it like one in the town. Seen: dev mode's person card ("laws") for a person outside the town, and the law's reach on its bill card.

**Cause.** Found in code: src/core2/law-reach/group-b-veterans.ts `payVeterans` reads `townFacts(api, town)` (line 53) and pays counted veterans into the residents account whose `placeId` is the town (line 93).

**Fix.** `payVeterans` reads `placesFacts(api, townStatePlaces(...))` and pays each counted group into its own place's residents account. Each payment is recorded as applied under the law's id, so `lawReach` and the person card show it. Reuse the Medicaid fix's place list; add no second list.

**Time box.** 3 hours for one Sonnet session at medium effort.

**Rules.** One rule, all 56 places: the places reached come from the residents runtime's records, never a named state. Every effect can be triggered and traced in dev mode: the person card shows the law on a person outside the town.

**Done when.** A second session, in dev mode at a drawn place from all 56, opens a person billed outside the town who qualifies and sees the law on their card with its payment, by record id. It then ends the law in dev mode, advances a month, and sees the payment stop.

**Waits on.** law-medicaid-record-keeps-only-the-towns-own-jurisdiction (its place list).

**Files.** src/core2/law-reach/group-b-veterans.ts

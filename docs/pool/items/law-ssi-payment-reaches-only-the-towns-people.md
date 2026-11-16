---
id: law-ssi-payment-reaches-only-the-towns-people
title: "SSI and a state's supplement reach only the town's people"
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

**What.** SSI and a state's supplement reach only the town's people. The households the coverage engine bills in the places around the town, in its state, have cash accounts and bills, but this law never reaches them, though SSI is federal and its supplement is a state law, so both reach every eligible person in the state's places the world keeps. Seen: dev mode's person card ("laws") for a person outside the town, and the law's reach on its bill card.

**Cause.** Found in code: src/core2/law-reach/group-b-money.ts `paySsi` (line 1505) pays only into the residents account whose `placeId` is the town (line 1552), from `runPolicy`'s town-only facts (group-b.ts line 433, case ssi-payment).

**Fix.** The ssi-payment case reads `placesFacts(api, townStatePlaces(...))`, and `paySsi` pays each place's counted people into that place's residents account. Each payment is recorded as applied under the law's id, so `lawReach` and the person card show it. Reuse the Medicaid fix's place list; add no second list.

**Time box.** 3 hours for one Sonnet session at medium effort.

**Rules.** One rule, all 56 places: the places reached come from the residents runtime's records, never a named state. Every effect can be triggered and traced in dev mode: the person card shows the law on a person outside the town.

**Done when.** A second session, in dev mode at a drawn place from all 56, opens a person billed outside the town who qualifies and sees the law on their card with its payment, by record id. It then ends the law in dev mode, advances a month, and sees the payment stop.

**Waits on.** law-medicaid-record-keeps-only-the-towns-own-jurisdiction (its place list).

**Files.** src/core2/law-reach/group-b-money.ts, src/core2/law-reach/group-b.ts

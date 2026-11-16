---
id: law-child-care-payment-reaches-only-the-towns-children
title: "A state's child care payment reaches only the town's children"
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

**What.** A state's child care payment reaches only the town's children. The households the coverage engine bills in the places around the town, in its state, have cash accounts and bills, but this law never reaches them, though a state law reaches every household in the state's places the world keeps. Seen: dev mode's person card ("laws") for a person outside the town, and the law's reach on its bill card.

**Cause.** Found in code: src/core2/law-reach/group-b-money.ts `payChildCare` (line 1303) pays only into the residents account whose `placeId` is the town (line 1342), from `runPolicy`'s town-only facts (group-b.ts line 433, case child-care-payment).

**Fix.** When the law is at the state or federal level, the child-care-payment case reads `placesFacts(api, townStatePlaces(...))`, and `payChildCare` pays each place's counted children into that place's residents account. Each payment is recorded as applied under the law's id, so `lawReach` and the person card show it. Reuse the Medicaid fix's place list; add no second list.

**Time box.** 3 hours for one Sonnet session at medium effort.

**Rules.** One rule, all 56 places: the places reached come from the residents runtime's records, never a named state. Every effect can be triggered and traced in dev mode: the person card shows the law on a person outside the town.

**Done when.** A second session, in dev mode at a drawn place from all 56, opens a person billed outside the town who qualifies and sees the law on their card with its payment, by record id. It then ends the law in dev mode, advances a month, and sees the payment stop.

**Waits on.** law-medicaid-record-keeps-only-the-towns-own-jurisdiction (its place list).

**Files.** src/core2/law-reach/group-b-money.ts, src/core2/law-reach/group-b.ts

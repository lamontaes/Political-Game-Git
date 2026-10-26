---
id: gov-bribe-offer-reads-known-money-trouble
title: "A bribe offer weighs what the offerer knows of the official's money trouble, so bribes go to the broke official, not to every member on every contract"
area: gov
kind: wiring
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** A business owner bidding on a public contract weighs offering a bribe to each member who votes on the award, and the offer decision (considerBribe in src/core2/modules/corruption.ts) reads only the offerer's temperament, the stake, their tie to the official and what they have heard of the official. An offerer whose temperament leans fully toward it (1.0 for every Kingfield offer) plus the stake of a public contract (1.3 to 3.2) tops the pull of refusing (3), and the decision's two terms about the official, their tie and what the offerer has heard of them, were zero, so that bidder offers every member who votes, whoever they are: in two played years Davie, Florida (seed 694f68f1f5df5250) saw 434 offers, 352 of them to state members over state contracts, and Kingfield, Maine (seed smoke-bribe-1) saw 382 in its first month, while Wheatfields, Arizona and Wilkeson, Washington saw none (scripts/research/bribe-chain-years.ts). The owner's rulings say offers follow reputation, and that a broke official is who lobbyists and bribes go after, and officials' finances are public. No record of officials' finances exists yet, so add what the offerer has learned of the official's money trouble (a knowledge record of an eviction, a foreclosure or missed payments that reached them by news, a conversation or a notice, never the official's private balance) to the offer decision, so an official no one knows to be short draws few offers and one known to be in trouble draws more.

**Rules.** No dice: the offer follows the offerer's own reasons and what they can see, never a share or a roll. Look before you ask: owner rulings #5333 (offers follow reputation) and owner-why-money-exists (3) and (4). Sliding scales: the pull grows with the visible pressure, no cutoff. One rule, all 56 places. Speed: read on the award or meeting day only.

**Done when.** In four drawn places played two years (buildBenchWorld, scripts/research/bribe-chain-years.ts, seeds named), offers fall from thousands a year to a count the PR body names per place-year, the officials offered are the ones the offerers knew to be short (by person id and the knowledge record each offer cites), and src/core2/corruption.test.ts passes with a case where an official in debt draws an offer a cushioned one does not.

**Files.** src/core2/modules/corruption.ts, src/core2/modules/contracts.ts, src/core2/modules/interest-groups.ts, src/core2/data/corruption/parameters.json

**Notes.** Filed Oct 25 by the effects lead from gov-bribes-in-played-worlds-measured.

Deferred Oct 25: nothing on screen reads it yet.

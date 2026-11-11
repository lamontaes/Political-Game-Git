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
after:
lead: governing
standard: 2
model: opus
effort: high
root: rc3-thin-life-record
checked: fable 2026-11-10
---

**What.** A business owner bidding on a public contract weighs offering a bribe to each member who votes on the award, and the offer decision reads only the offerer's temperament, the stake, their tie to the official and what they have heard of the official (reputation was added in gov-bribe-offers-follow-reputation). An offerer whose temperament leans fully toward it plus the stake of a public contract tops the pull of refusing, so that bidder offers every member who votes, whoever they are: in two played years Davie, Florida (seed 694f68f1f5df5250) saw 434 offers, 352 of them to state members over state contracts, and Kingfield, Maine (seed smoke-bribe-1) saw 382 in its first month, while Wheatfields, Arizona and Wilkeson, Washington saw none (`scripts/research/bribe-chain-years.ts`). Offers should follow what the offerer has learned of the official's money trouble: a knowledge record of an eviction, a foreclosure or missed payments that reached them by news, a conversation or a notice, never the official's private balance. Seen: bribe offers in the news and the player's office, which go to the official who is in money trouble, not to every member on every contract.

**Cause.** Found in code: `src/core2/modules/corruption.ts` `offerValues` (line 216) and `considerBribe` (line 235) read temperament, stake, tie and `heardOf` (reputation) only; no knowledge record of the official's money trouble is read.

**Fix.** Add a knowledge record of an official's eviction, foreclosure or missed payments that reached the offerer by news, talk or notice, and add its pull to `offerValues` as a sliding term, so an official no one knows to be short draws few offers and one known to be in trouble draws more. Read it on the award or meeting day only.

**Time box.** 8 hours for one opus session.

**Rules.** No dice: the offer follows the offerer's own reasons and what they can see, never a share or a roll. Look before you ask: owner rulings #5333 (offers follow reputation) and owner-why-money-exists (3) and (4). Sliding scales: the pull grows with the visible pressure, no cutoff. One rule, all 56 places. Speed: read on the award or meeting day only.

**Done when.** A second session plays two years in four drawn places (`buildBenchWorld`, `scripts/research/bribe-chain-years.ts`, seeds named) and sees offers go to officials the offerers knew to be short, by person id and the knowledge record each offer cites, with the offer count per place-year reported next to the earlier 434 and 382. `src/core2/corruption.test.ts` passes with a case where an official in debt draws an offer a cushioned one does not.

**Waits on.** Nothing.

**Files.** src/core2/modules/corruption.ts, src/core2/modules/contracts.ts, src/core2/modules/interest-groups.ts, src/core2/data/corruption/parameters.json, src/core2/corruption.test.ts, scripts/research/bribe-chain-years.ts

**Notes.** Filed Oct 25 by the effects lead from gov-bribes-in-played-worlds-measured.

Deferred Oct 25: nothing on screen reads it yet.

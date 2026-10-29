---
id: realistic-row45-vacant-house-seats-two-sources
title: "Two-seed guard row 45 is red when the town is in Florida or Texas: two House seats vacant in the roster are seated by the offices engine with an estimated party"
area: elections
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The party roster (data/research/offices/legislature-party-counts-2026.json) has no holder for two House seats, Florida's 20th and Texas's 23rd, vacant on its research date. Every other state's members come from the world roster (worldRoster in src/core2/electorate-places.ts), so those two seats are empty there; but when the player's town is in Florida or Texas, the offices engine seats the town state's members from its own terms and unrecordedParty in src/core2/modules/officials.ts falls back to the party that carried the state in 2024. Row 45 of src/core2/realistic-not-real.test.ts holds every seated member to the world roster's holder, so it fails: Dania Beach, Florida (1216335), seed bc1828b7a8d4cc55, seat:US-FL:us-house:20 expected 'Republican' to be null. One fact, two sources: whether the seat opens vacant or filled must be the same in both.

**Rules.** One engine per mechanic and one source per fact: the world roster is the one record of who holds each congressional seat at Start, so the offices engine reads it or the roster draws the vacant seat's holder the way it draws every other. Estimate, never UNKNOWN: a vacant seat either opens vacant pending its special election, by the record, or opens with a drawn holder, never with the guard skipped. One rule, all 56 places.

**Done when.** src/core2/realistic-not-real.test.ts passes with REALISTIC_SEED=bc1828b7a8d4cc55 and on a fresh draw whose town is in Texas (place and seed named in the PR body), and a buildBenchWorld world in Florida shows seat:US-FL:us-house:20 with the same holder, or the same vacancy, in the world roster and in allOfficials, by record id.

**Files.** src/core2/electorate-places.ts,src/core2/modules/officials.ts,data/research/offices/legislature-party-counts-2026.json,src/core2/realistic-not-real.test.ts

**Notes.** lead: wire-elections. Filed by the standing red-main owner Oct 29 13:40 UTC from a fresh draw while fixing the delegate-seat variant of the same row (PR fixer/red-main-row45-delegate). Read: OWNER-DECISIONS (Oct 27 realistic not real; Oct 28 one engine per mechanic); searched docs/pool/items for row 45, vacant seat: none.

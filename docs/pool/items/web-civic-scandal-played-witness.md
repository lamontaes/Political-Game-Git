---
id: web-civic-scandal-played-witness
title: "A scandal that arose in play reaches voters' ballots, by record"
area: core
kind: wiring
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after: gov-bribes-in-played-worlds-measured
lead: effects
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
source: added with npm run pool -- add
checked: fable 2026-11-10
claimed-at:
branch: claude/pool-web-civic-scandal-played-witness
---

**What.** The voting engine's scandal term carries exposed-corruption-to-reelection: a voter who heard a story about a candidate's taken bribe or public conviction weighs it. outcome-web-civic-played.test.ts checks that every kept ballot whose voter heard such a story carries the term, but in three drawn worlds played to November 30, 2026 (Cuyamungue Grant, New Mexico; Lawton, North Dakota; Camp Sherman, Oregon) no bribe was offered at all, so no story existed and the check had nothing to hold. Once gov-bribes-in-played-worlds-measured says how often bribes should arise, find a drawn place and seed where one surfaces before a race, and name the ballot that carried the term.

**Cause.** Measured: npx vitest run src/core2/outcome-web-civic-played.test.ts in three drawn worlds (the item records the places but not their seeds) played to November 30, 2026 (Cuyamungue Grant, New Mexico; Lawton, North Dakota; Camp Sherman, Oregon): no bribe was offered, so no scandal story reached a voter and the check held nothing.

**Fix.** Draw places until one shows a bribe or conviction story about a candidate that arose in play before a race (no hand-inserted scandal), and assert a kept ballot carries the scandal term for that candidate, naming the ballot id. If no drawn place in a bounded number does, report the rate and stop.

**Time box.** 3 hours for one Sonnet session.

**Rules.** An effect is a read, not a record: the ballot's appeal must carry the scandal term because the voter heard the story. No hand-inserted scandal: the earlier send-back refused one. No dice.

**Done when.** A second session runs src/core2/outcome-web-civic-played.test.ts in a drawn place and seed it chose (named) and sees a scandal story about a candidate that arose in play before a race and at least one kept ballot carrying the scandal term for that candidate, by ballot id; if no drawn place in the bounded draw shows one, the report gives the rate.

**Waits on.** Nothing. (gov-bribes-in-played-worlds-measured is done.)

**Files.** src/core2/outcome-web-civic-played.test.ts

**Notes.** Split Oct 25 by the effects lead from web-reach-civic, whose economy witness is in its PR.

Released (2026-11-11): seed sc1 (CIVIC_PLAYED_SEED) crashes in drives.ts: Drive requires a learned source event (speech.ts deliverSpeech via a public comment); the proof cannot run there; needs a draw that survives. Continue on branch claude/pool-web-civic-scandal-played-witness.

---
id: elections-counted-vote-share-test-red-magnolia
title: "The counted-vote-share tally test is red at Magnolia, Delaware: a counted record's kept split is 1 where the formula gives 0.52"
area: elections
kind: bug
priority: 2
size: S
status: merged
standard: 2
claimed-by: claude/fable-b-counted-share-block-votes
pr: #9488
after:
blocked-on:
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
lead: governing
source: Account lead thread "Make elections read your record", Nov 14 (red on the clean train 8bc765b3 and on #9191)
claimed-at:
merged-at: 2026-11-16T01:37:30.254Z
---

**What.** `src/core2/counted-vote-share.test.ts` case (d) fails at a fixed draw: `COUNTED_SHARE_SEED=e2051d49e318d174 npx vitest run src/core2/counted-vote-share.test.ts` draws Magnolia, Delaware (place key 1044430), world seed 55a4fe01cf3f02e6eab932b0f8119845b7e495c5067b24586420f8937cffafaa, contest `contest:seat:gus2025:207646:council:0:2026-04-07`. The kept split for record `person_06ffe5a401dfa6d9` for candidate `person_153b71e4e80fd494` is 1, and the test's own recomputation from the kept appeal gives 0.5174731946594913. Seen: in the town's counted vote on that race.

**Cause.** Measured: Magnolia, Delaware (1044430), world seed 55a4fe01cf3f02e6eab932b0f8119845b7e495c5067b24586420f8937cffafaa, `COUNTED_SHARE_SEED=e2051d49e318d174 npx vitest run src/core2/counted-vote-share.test.ts -t "(d)"` on the train at 53e4b29fe8, with the appeal the count used and the appeal read back printed side by side for record person_06ffe5a401dfa6d9 in `contest:seat:gus2025:207646:council:0:2026-04-07`. That race fills two council seats. Three things were out of step with a race for several seats.

1. The count gives each of a record's people up to as many votes as there are seats (`blockShares`, src/core2/electorate.ts), so the record's kept split sums to 2. The test's own arithmetic (`formulaShares`) gives one vote a person.
2. With that allowed for, the kept split still differed by half a percent, and this one is the game's fault: the count reads each voter's stance profile with the world's seed and the household's circumstances (`countedStanceProfile`, src/core2/modules/views.ts), but the row it keeps held only faith and degree. `countedBallotAt` (src/core2/modules/voting.ts) rebuilt the appeal without the other two, so its recognition term was 0.3735 where the count had used 0.3972. Anything that reads a counted voter's ballot back read reasons the count did not use.
3. A named voter's ballot in such a race holds every candidate picked (`choices`), and the test tallied one choice a ballot (23 against the result's 30).
   The Glencoe, Minnesota red (`tests-counted-vote-share-split-first-place-glencoe`, seed 3e755ead4b7c2887) is the same three.

**Fix.** Built in pull request #9488.

1. The count's kept row holds each voter's circumstances (`life`) and the world's seed, and `countedBallotAt` reads them through one new reader, `countedProfileAt`. A counted voter's ballot now reads back the reasons that were counted. A row kept before this reads as it did.
2. The test works the block rule out for itself (`blockVotes`) from the race's seat count (`atLargeGroup`), and tallies every choice on a named ballot.

**Time box.** 2 hours for one Opus session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: a counted record's split is a share of its count, never a roll. Never loosen the test to get green; it is pinned to a named place and seed as `pinned-tests` says.

**Done when.** A second session runs `COUNTED_SHARE_SEED=e2051d49e318d174 npx vitest run src/core2/counted-vote-share.test.ts -t "(d)"` on the train and sees it pass at Magnolia, Delaware, and the same at Glencoe, Minnesota with seed 3e755ead4b7c2887; and in the running game, in Magnolia or in a drawn place it names with its seed, with dev mode on, opens a council race for more than one seat once it is counted and reads a counted voter's ballot: the reasons add up to the split the count kept for that voter.

**Waits on.** Nothing.

**Files.** src/core2/counted-vote-share.test.ts, src/core2/modules/voting.ts

Nov 15 (views thread): still red on the train at ff9703d7 with GOLDEN_PATH_SEED=677b2a035fef1f4f, at Clyde Park, Montana (3015550), world seed c777ff85: in contest:seat:gus2025:169466:council:0:2025-11-04, record person_03a575eda173eaaf for person_0e4c0b3cdbd4be63 has a kept split of 1 where the formula gives 0.40.

---
id: gov-presidency-ballot-from-candidacy
title: "The presidency's ballot is filled by a party-nominee stand-in, because outside officials who run are refused and one party's officials fill the field"
area: elections
kind: bug
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: claude/long-game-presidency-nominees
pr:
after:
blocked-on:
root: none
lead: governing
model: fable
effort: high
source: Long game lane, Nov 17 (the CTO's ruling of 01:05Z on issue 9747: the presidency's ballot is the candidacy engine's alone)
---

**What.** With the stand-in (`fileNominees`) off, candidacy did not put both major parties on the presidential ballot. At Veazie, Maine (seed 1665984868874446, a world opening 2028-01-02) the ballot held the sitting president and one independent. At Quinton, Oklahoma (seed 2fddcecdc805d664) seven Republicans ran and none of the 438 Democrats who weighed it.

**Cause.** Found in code, two causes. (A) Another place's officeholder who decided to run was refused on `party-member`: `checkEligibility` in src/core2/modules/elections.ts read only a party tie in town or a term under the person's own id, while the candidate pool files them under the party on their official record (`partyOf` in src/core2/candidate-pool.ts). (B) In `weighContest` (src/core2/modules/candidacy.ts) the crowded-race reason counted every party's runners, and full people weighed the race in id order, so one party's officials (with stronger backing) filled the field before the other party's were weighed.

**Fix.** (A) The party-member rule also reads the official record's party. (B) In a partisan race a would-be candidate weighs the runners on their own side (the primary they would enter) at `candidacyPrimaryFieldWeight`, and full people weigh a race strongest pull first, as the counted residents already do. The presidency gets no party-nominee stand-in; statewide races keep it until the state party's ask reaches its officeholders (item to file).

**Time box.** 4 hours.

**Rules.** No dice; one rule for all 56 places; runners per partisan race stay plausible at drawn places (CTO, Nov 17, 02:49Z).

**Done when.** `src/core2/presidency-candidates.test.ts` passes at a drawn place and fails on main's code; the wide-races stand-in case passes; `src/director/party-ask-refused.test.ts` draws its places and passes; at two drawn places the runners per side in partisan races stay near main's.

**Waits on.** Nothing.

**Files.** src/core2/modules/elections.ts, src/core2/modules/candidacy.ts, src/core2/modules/voting.ts, src/core2/data/candidacy/parameters.json, src/core2/presidency-candidates.test.ts (new), src/core2/wide-races.test.ts, src/director/party-ask-refused.test.ts

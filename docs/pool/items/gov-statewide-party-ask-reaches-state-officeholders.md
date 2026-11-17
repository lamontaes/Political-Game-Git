---
id: gov-statewide-party-ask-reaches-state-officeholders
title: "A state party's ask for a statewide race reaches only its town members, so a whole side can stay empty and the statewide stand-in stays"
area: elections
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after: gov-presidency-ballot-from-candidacy
blocked-on:
root: none
lead: governing
model: fable
effort: high
source: Long game lane, Nov 17 (the CTO's ruling of 01:05Z on issue 9747; cause C of the presidency probe)
---

**What.** With the party-nominee stand-in off, a statewide race can have no candidate on one side. At Veazie, Maine (seed 1665984868874446, a world opening 2028-01-02) the U.S. Senate race had three Democrats and two independents and no Republican: the Republican chair asked five town members, each declined (pull about 3.5 with the ask), and 120 Republicans who weighed it stayed out.
Seen: a statewide race on the ballot screen with one party's side empty, once the stand-in is gone.

**Cause.** Found in code: `partyProspects` in src/core2/modules/candidacy.ts asks only members who live in the town (`person.placeId === town.townPlaceId`) and know the chair. For a statewide race the owner's ruling (Oct 14, morning: "Statewide races draw statewide candidates. The state's party leaders and officeholders are the pool for governor, lieutenant governor, attorney general and the like") puts the state's party officeholders in the pool, but the party's ask never reaches them.

**Fix.** For a statewide race, a party with no one filed asks its own officeholders and party officers in the race's standing pool (`standingPool`), the inroads rule read as the state party's ties to them, strongest standing first, until one runs or the asks run out; then delete `fileNominees` for statewide races, as the CTO ruled for every wide race.

**Time box.** 4 hours.

**Rules.** No dice; one rule for all 56 places; the inroads rule (owner, Oct 15: a party asks only where it has inroads); a side may still stay empty when every one asked declines, and the record says why.

**Done when.** A second session opens the ballot in the running game at a drawn place after a statewide filing close and sees both parties' candidates. With `fileNominees` deleted, at three drawn places each statewide race at its filing close has both major sides filed by candidacy, or a record of every ask declined; a test fails on main's code (the stand-in files the missing side).

**Waits on.** gov-presidency-ballot-from-candidacy (#9848).

**Files.** src/core2/modules/candidacy.ts, src/core2/modules/voting.ts

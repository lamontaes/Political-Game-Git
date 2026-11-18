---
id: press-county-candidate-asked-by-nine-local-outlets
title: "A county commissioner candidate is asked for an interview by nine local outlets in one season"
area: director
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: opus
effort: medium
root: none
source: Account lead thread "Fix six interviews in one day", Nov 14 2026, from PR 9161's test
checked:
---

**What.** A player running for county commissioner in a place with no city government is asked by nine outlets in nine days (four newspapers, two radio stations, three television stations) for one race with two candidates. Seen: nine interview invitation calls from Sep 28 to Oct 6, 2026.

**Cause.** Measured: Patrick AFB, Florida (1255375), world seed `interview-invites-one-a-day:1255375`, county commissioner contest `contest:seat:gus2025:161546:board:2:2026-11-03`, player filed through `fileCandidacy` with no platform: `src/core2/press-invitations-one-a-day.test.ts` records ten outlet asks for the race (nine to the player). Every outlet invited because `newsworthyBar` is 0 for newspapers and radio and `televisionBar` is low (0.3), and `interviewsPerWeek` (2) is a per-outlet cap that nine outlets never reach with two candidates. Found in code: `pressWeek` in src/core2/modules/press.ts asks every outlet of the town's `outletsHere` about every candidate in a race in the window; no outlet reads whether the race is on its own readers' ballot or how many candidates are worth the airtime of a place this size.

**Fix.** Design: an outlet asks for a race only when its own readers vote in it (a county's outlets for the county, a town's for the town), and the number of sittings an outlet gives one race follows its staff hours (the existing `interviewsPerWeek`) against the number of races it covers, so a small county does not give nine outlets to one race. Read the outlet's followers from the audience record the press already keeps.

**Time box.** 3 hours for one Opus session at medium effort. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No dice. An effect is a read: the outlet's audience record is read at the moment it decides to ask.

**Done when.** A second session plays a county race on main in a drawn place, names the seed, and counts the outlets that ask: fewer than the outlets the place has, each one a paper, station or channel whose readers vote in that race.

**Waits on.** Nothing.

**Files.** src/core2/modules/press.ts, src/core2/press-invitations-one-a-day.test.ts

**Notes.** Found while testing PR 9161; that PR spaces the calls one a day and does not change who asks.

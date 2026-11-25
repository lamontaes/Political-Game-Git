---
id: parties-opening-chair-knows-no-members
title: "The opening world gives a party chair almost no ties to its members, so the first filing windows find no one the chair could ask"
area: elections
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: elections
model: opus
effort: medium
root: none
source: found by M5 while building the request-needs-its-ground filter, Nov 14, 2026
claimed-at:
branch: claude/project-thread-jwna62
---

**What.** A party asks a member to run only when the member knows the chair or the two have a tie (owner, Oct 15: "The party asks someone to run only with some inroads on record"; `partyProspects` in src/core2/modules/candidacy.ts). The ties come from the monthly party meeting, where each member who decides to attend gets a contact tie with the chair. The world opens with nearly none, so the first filing windows, when a new player is watching, find almost no one to ask. Seen: in dev mode on the first day of a new life, where a party chair's people list shows no member of the party they know.

**Cause.** Measured: party-tied members with ground to be asked (they know the chair, or a relationship row joins them), at start, day 365 and day 640, played with `buildBenchWorld` from the train at da2b7064 plus the filter, places drawn with `drawPlace("request-ground-measure", tag)`: Eagle Rock, Missouri (tag one, seed 984a23cab1ea83cb0a1d2a8b4f58c1dc7b79c4a4aba435264490b253b20a2b57) 0 of 11, 5 of 30, 10 of 32; Breathedsville, Maryland (tag two, seed eb7bf5962b7c91580493e25b412315491d7919f3bfaa5fc6b44a1b5435f719d5) 1 of 34, 27 of 67, 34 of 71; Goodhue, Minnesota (tag three, seed 94c5bcc92e6aca539a125580253b15178a5c73c18ec7aab55e8bd912e43ddc7e) 3 of 63, 53 of 107, 94 of 135. Each place held 24 meetings by day 365. Party asks over 640 days at Breathedsville fell from 12 to 4 with the filter, all of the loss in the first windows; empty seats did not change (0 races with no filing at all three places). Found in code: `partyMeeting` in src/core2/modules/parties.ts writes `api.relationship(leaderId, id, "contact", 0.1)` for each attendee, and the world build writes no such tie for meetings before day one.

**Fix.** Generation of what exists (CTO, Nov 14): at world build, a chair already has contact ties with the members who, by the same attendance rule the monthly meeting uses (`attendCase` and `leanedYes` on "parties.attend": free time, distance from home), would have come to the past year or two of meetings. No new rule, no dice beyond what the meeting already uses, and the tie's closeness as the meeting writes it, aged by the time since.

**Time box.** 2 hours for one Opus session. When it runs out, push what is measured, set the state honestly with a one-line note, and stop.

**Rules.** No dice: attendance is weighed by the meeting's own rule. One rule, all 56 places. Speed: a year may not run more than 20 percent slower than its base. The request-needs-its-ground filter stays as it is.

**Done when.** A second session starts a new life in the running game at a drawn place (named with its seed), and on the first day, before any party meeting, dev mode shows each party chair already knowing the members who would come to its meetings by the meeting's own rule. Beside it, at Eagle Rock, Breathedsville and Goodhue (seeds above), year 1 and time per record with and without the opening ties.

**Waits on.** The request-needs-its-ground filter PR on the train.

**Files.** src/core2/modules/parties.ts, src/core2/modules/candidacy.ts

**Notes.** The jobless stock and voter registration are two other cases of a world that opens as if nothing happened before day one (CTO, Nov 14).

Released by next (2026-11-18): no push to claude/project-thread-jwna62 since 2026-11-15 08:15 UTC, more than twice its 2-hour time box. Continue on branch claude/project-thread-jwna62.

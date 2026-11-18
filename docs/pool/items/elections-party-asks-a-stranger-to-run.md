---
id: elections-party-asks-a-stranger-to-run
title: "A party asks members to run who have never met its chair"
area: elections
kind: bug
priority: 2
size: S
status: merged
standard: 2
claimed-by: claude/project-thread-jwna62
pr: 9302
after: parties-opening-chair-knows-no-members
blocked-on:
lead: elections
model: opus
effort: medium
root: none
source: found by M5 building the words rule request-needs-its-ground, Nov 14, 2026
---

**What.** When no one has filed under a party's label for a seat, the party's chair asks members to run (`partyProspects` in src/core2/modules/candidacy.ts). The owner ruled that the party asks only with some inroads on record (Oct 15: "The party asks someone to run only with some inroads on record"; words rule request-needs-its-ground in data/english/line-rules.json), but the prospects list took any member of the party in town, so a chair asked people they had never met, and the scene has the chair speak as if they knew them ("People in {place} know you, and you're one of ours"). Seen: the party-recruit scene, where the person asked is someone the chair has no tie with.

**Cause.** Found in code: `partyProspects` in src/core2/modules/candidacy.ts filtered members by age, eligibility, filings and commitments, and sorted by closeness to the chair, but never required any closeness. Measured: at Floydale, South Carolina and Denver, Pennsylvania (seed c29-party-ask-refused, tags a and d) the played world held party-asked records to members with no contact and no relationship row with the chair.

**Fix.** In `partyProspects`, keep only members who know the chair (`knownIds`) or share a relationship row with them. No new rule or number; the opening ties (parties-opening-chair-knows-no-members) give the first windows people to ask.

**Time box.** 2 hours for one Opus session. When it runs out, push what is measured, set the state honestly with a one-line note, and stop.

**Rules.** No dice. One rule, all 56 places. A test stays pinned to one place and seed and runs in about a minute.

**Done when.** A second session plays a new life in the running game at a drawn place (named with its seed) to a party filing window, and in dev mode every member the party asked to run shows the chair among the people they know. Beside it, `src/director/request-needs-its-ground.test.ts` and `src/director/party-recruit.test.ts` pass on main.

**Waits on.** Nothing.

**Files.** src/core2/modules/candidacy.ts, src/director/request-needs-its-ground.test.ts, src/director/party-recruit.test.ts

**Notes.** The rule's other two cases have no line to check yet: no bank line says "I'll take the meeting", and a donor's lean is staged only from a gift on record.

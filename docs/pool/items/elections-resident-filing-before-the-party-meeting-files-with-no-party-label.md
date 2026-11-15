---
id: elections-resident-filing-before-the-party-meeting-files-with-no-party-label
title: "A town resident the party meeting has not met files for a House seat with no party label, so the ballot reads as missing a major party"
area: elections
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: elections
model: sonnet
effort: medium
root: none
source: Account lead measurement, Nov 15, 2026 (party-asks item)
---

**What.** In a played world a share of U.S. House seats read as missing a major party on the ballot, when the missing party's candidates did file but carried no label. Measured on the Train head 53e4b29f at 11 drawn places (`drawPlace("fields-measure2", tag)`, April 2026): 4 of 11 House seats showed one major party missing. At Las Cruces, New Mexico four Republicans filed with no label, and at Gatlinburg, Tennessee four did; after this fix 1 of 11 shows a party missing (Gabbs, Nevada, three Democratic filers), against 8.7 percent of real 2024 House races. Seen: the House race on the Politics screen's Elections tab with filers under no party, and a ballot with one major party's name absent.

**Cause.** Measured: Las Cruces, New Mexico (seed from `drawPlace("fields-measure2", "c")`), House seat `contest:seat:US-NM:us-house:02:2026-11-03`: four filers (ids ending bed2, 7152, 1dfb, 92ed) filed on 2026-01-09 with `party: null`, and the town's party meeting tied each of them to the Republican party on 2026-01-15 (`reason: newly-tied`). Found in code: `fileFor` in `src/core2/modules/candidacy.ts` labels a filing with `partyOf` the person, which is null for a resident with no tie row; `partyMeeting` in `src/core2/modules/parties.ts` ties adults only monthly, and at the opening 38 of the town's 181 adults have no tie (tie reasons on day 0 at Las Cruces: 79 lean-matches-party, 53 independent-minded, 10 leans-nowhere, 1 the player; 151 more "newly-tied" over the next 12 months).

**Fix.** Done in this item's pull request: a resident files for a partisan seat only after taking their tie by the meeting's own rule (`tieBeforeFiling`, which shares one rule with `partyMeeting` through `townTieRule` and `tiePerson`). No second rule, no tuned number.

**Time box.** 2 hours.

**Rules.** No dice: the party follows the person's lean by the opening's rule. One rule, all 56 places: nothing names a place.

**Done when.** A second session plays Las Cruces, New Mexico (seed `fields-measure2` tag c) to April 2026 on main and sees Republican and Democratic filers on the House race's Elections tab, with no filer under no label; and 12 drawn places played to the filing deadline show fewer than 15 percent of House seats with a major party missing.

**Waits on.** Nothing.

**Files.** src/core2/modules/parties.ts, src/core2/modules/candidacy.ts

**Notes.** Gabbs, Nevada still shows three Democratic filers and no Republican: a small safe seat, in the range real House races show, so the party ask for people outside the town (`partyProspects` reaches only town members) is not changed here. Read a larger named set before calling it.

Read at 16 named places (`drawPlace("fields-measure2", tag)`, tags a to p, played to April 2026, head 8c173f9c), so nobody measures it again: 12 places had a seat past its filing deadline by then. U.S. House: 9 seats, 1 with a major party missing (Gabbs, Nevada), 11 percent. State legislative: 15 seats, 3 missing (Las Cruces NM 1 of 2, Elohim City OK 1 of 2, Gabbs NV 1 of 1), 20 percent, against at least the 38.5 percent single-candidate share in `benchmarks.json`, so the world is on the low side. Six places (Thorne Bay AK, Big Horn WY, Valley Falls RI, Downing WI, West Wareham MA, Inglis FL) had no seat past its deadline by April 10. The party ask was not changed; Gabbs, Nevada is the one open case.

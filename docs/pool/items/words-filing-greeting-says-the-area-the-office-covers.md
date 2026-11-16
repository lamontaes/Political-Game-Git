---
id: words-filing-greeting-says-the-area-the-office-covers
title: "A Secretary of State's clerk greets a U.S. Senate filer with 'I take the filings for Vicco', a town clerk's line"
area: words
kind: bug
priority: 3
size: S
status: merged
standard: 2
after:
blocked-on:
model: sonnet
effort: low
root: none
pr: 9378
source: second words reader on #9348, Nov 14
lead: words
---

**What.** At the filing counter in Vicco KY and West Point KY the same Secretary of State clerk opens one talk "This is the Secretary of State" and another "I keep the candidate list for Vicco" or "I take the filings for West Point", a town clerk's line in a state office's mouth. Seen: the clerk's greeting at the filing counter.

**Cause.** Found in code: `openFilingVisit` in `src/director/filing-visit.ts` gave the `greet-counter` move `placeFact`, which is always the player's town, even when the counter takes only state, federal or county races.

**Fix.** `counterAreaFact` in `src/director/filing-visit.ts` says the town at a town's counter, the state at a counter that takes only state and federal races, and the county at a county's (none where the place map holds no county for the town); the greeting pieces that need `place` then stand down. No bank line changes. The player sees it at the clerk's greeting when filing for a state or federal office.

**Time box.** 1 hour.

**Rules.** No dice. One rule, all 56 places: no place is named in logic; the test pins Edgar WI.

**Done when.** A second session plays a state or federal filing at a drawn town and the greeting never names the town, and a town race still says the town; names the place and seed.

**Waits on.** Nothing.

**Files.** src/director/filing-visit.ts, src/director/filing-greeting-area.test.ts

**Notes.** Built after the reader's note on #9348; test pinned at Edgar WI, seed 4d8a2d61-6aea-48c7-8043-906d5c563aaa.

---
id: gov-needs-opus-gov-124
title: "Needs from other sessions listed in OPUS-GOV.md (line 124): 3 lines"
area: gov
kind: wiring
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: 'docs/coordination/OPUS-GOV.md "Needs from other sessions" (line 124)'
---

**What.** Each line below was a request one session made of another. The asking sessions are gone, so each is a wiring job for whoever claims it. Verify against main first; skip what is already built and split off an item for any line that is large.

- OPUS-CORE: rows in #4191's `outside-flows.json` for `treasury` and `federal-borrowing`, and `outside-revenue` matched instead of a plug, so the stricter M0-08 passes; `setStandingContractAmount` for recipient-income contracts (SG-GOV-opening-award-level); a rerate for the residents' retirement flows (SG-GOV-counted-s
- Other GOV builder: a budget bill with no executive carries `departmentRequests` lines (`legislature.ts:439`).
  Questions for the owner: none.

**Rules.** Wire to the world; an effect is a read; nothing waits on another session (build the smallest registered stand-in).

**Done when.** Each line either built and read by another engine in a played year (record ids), or noted done on main. Update the status file.

**Files.** varies

**Notes.** Overnight pool item 10: claim one list at a time. Verify.

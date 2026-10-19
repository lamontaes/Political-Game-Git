---
id: gov-standin-legislature-committees
title: "Committees are appointed by leadership, with names and sizes from each body's rules"
area: gov
kind: stopgap
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: split from gov-standins-other (Oct 19, 2026); rows SG-GOV-committee-structure, SG-GOV-committee-names-national, SG-GOV-local-bill-numbering, SG-GOV-local-executive-proposal, SG-GOV-federal-proposal-coverage
---

**What.** Committee seats go by seniority and party ratio, every chamber has the same nine subject committees, and every body numbers ordinances the same way. Replace these with each body's own committee list, appointment by its presiding officer or committee on committees, and its own numbering, all read from place data. Chairs and members then come from the chamber's leadership and the members' traits.

**Rules.** "An effect is a read": the replacement counts only when another engine reads what it writes at the moment it decides or pays. "No dice": traits, law and money decide, never a roll.

**Done when.** A played year in a drawn place, started with buildBenchWorld, shows the replacement read by another engine by record id, a test in a random place of all 56 names the place and seed, and each row (SG-GOV-committee-structure, SG-GOV-committee-names-national, SG-GOV-local-bill-numbering, SG-GOV-local-executive-proposal, SG-GOV-federal-proposal-coverage) is resolved in src/core2/data/stopgaps.json with the reason.

**Files.** src/core2/modules/legislature.ts, src/core2/legislature-committees.ts

**Notes.** Split out of gov-standins-other by the session that claimed it (claude/standins-other-credit-business).

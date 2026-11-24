---
id: office-small-town-council-member-offered-staff-including-fellow-members
title: "A $1,102-a-year council member is offered eight staff to hire, among them a fellow council member and two county commissioners"
area: office
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: sonnet
effort: medium
root: rc9-place-facts-one-default
source: "Account lead T25 playtest, Nov 13, 2026 (Danville, Iowa, seed 4b0fc31d-ba59-4168-8b84-d7c0e3f826b6, train c39bbb71)"
checked:
claimed-at:
---

**What.** Politics, Your office for a council member of a 900-person town shows 'Pay $1,102.00 a year' and a 'Your staff' list of eight people to Hire. They include Alex Franco, a sitting council member ('Applied · Work 90% · Lives near 100% · Age for the work 96%'), and county commissioners Riley Akhtar and Lisa Preston ('Someone you know · ... Knows you 10%'). A small-town council member has no staff, and a sitting official does not apply to be one. Seen: Politics, Your office, the Your staff list.

**Cause.** Found in code: staffCandidates in src/core2/modules/staff.ts (line 401) excludes no sitting officeholder, and a council member's pay is under staffHourlyMinor, so officials 'apply'. No staff allowance by office is read: gov-official-staff-allowance-by-office was dropped, and gov-staff-review-hires-unpaid-aide is the hire side of the same gap. Measured: Danville, Iowa, seed 4b0fc31d-ba59-4168-8b84-d7c0e3f826b6, train branch c39bbb71 (Account lead T25, Nov 13, 2026); Advanced start as Quinn Pugh.

**Fix.** Show Your staff only for an office whose government has a budget line that can pay an aide (the capped pay hireStaff already reads), and leave sitting officeholders out of the candidates. Leave the percent labels for the Words session; this item only decides who is listed.

**Time box.** 3 hours for one Sonnet session at medium effort. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** Wire to the world: a post exists only where a budget pays it. One rule, all 56 places.

**Done when.** A second session steps in on main as a member of a small town's council in a drawn place, named with its seed, and Your office lists no staff; a state legislator in the same world still sees staff to hire, and no sitting official is among them.

**Waits on.** Nothing.

**Files.** src/core2/modules/staff.ts, src/bench/office.ts

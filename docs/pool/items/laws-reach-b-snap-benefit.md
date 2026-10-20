---
id: laws-reach-b-snap-benefit
title: "A baseline SNAP benefit is paid by a benefits writer, and the work requirement counts each person's own months"
area: laws
kind: stopgap
priority: 3
size: M
status: in-pr
claimed-by: claude/snap-benefit
pr: #5443
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T02:29:31.351Z
---

**What.** The federal treasury pays each qualifying household a monthly SNAP benefit from the maximum allotment in force, read from households' wages, retirement awards and size; the work requirement counts each person's own months.

**Rules.** Replace, never layer: the shared work-requirement clock is replaced by per-person months. Numbers are sourced parameters. Shelter, child-care and medical deductions stay under SG-GOV-REACH-B-assistance-benefits.

**Done when.** `group-b-food-aid.test.ts` passes in a drawn place and a household's obligation, amount and payment can be followed by record id.

**Files.** src/core2/law-reach/group-b-food-aid.ts, group-b-money.ts, group-b-people.ts, group-b.ts, host.ts.

**Notes.** Oct 20. Year time unchanged (Cruz Bay, USVI: 259 s with, 281 s without; the town is over the limit on main).

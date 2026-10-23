---
id: world-small-town-treasury-shortfall
title: "Small towns' treasuries cover what their officials are paid (Brookford NC, a Mississippi town)"
area: gov
kind: bug
priority: 2
size: M
status: done
claimed-by:
pr: #4708
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** A short treasury is recorded as a shortfall and the pay authority covers the wage (public-work-pay.ts), but `publicPayShortfallMinor` is read only by a test, and nothing raises a small town's revenue to match its payroll, so Brookford, North Carolina held $93 at year's end against a finance director at $270 a day. Find why small towns' revenue falls short of their payroll (the outside-revenue plug, the tax base, the budget lines) and fix it at the root.

**Rules.** No dice (a death or a move comes from causes); an effect is a read; one rule, all 56 places; one model, two tiers; the chain is the acceptance.

**Done when.** In a drawn small town a one-year run ends with its treasury above its next month's payroll, or the shortfall is read by the budget and shows as a cut line, named by treasury and payroll record ids; no official goes unpaid for lack of the plug.

**Files.** src/core2/modules/budgets.ts, src/core2/public-work-pay.ts

**Notes.** Split out of world-needs-world-98 (the "Needs from other sessions" section of docs/archive/2026-10-23/coordination/world.md), checked against main on Oct 16, 2026.

Sent back 2026-10-16 from PR #4708 (branch claude/world-small-town-treasury-shortfall): GitHub refuses to merge a draft pull request (HTTP 405: "Pull Request is still a draft"). The merger skill's prescribed REST ready-for-review endpoint returns HTTP 404. Mark this PR ready for review, retain the named changed-file checks at the top, and push any needed corrections; finish on that branch, merge main into it first.

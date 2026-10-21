---
id: world-press-outlet-owners-no-household
title: "A press outlet's owner has no cash, no living cost and no income: owners draw nothing because their living cost is zero"
area: world
kind: bug
priority: 2
size: M
status: done
claimed-by: claude/political-game-pool-yucp92-ww
pr: #5545
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T05:44:17.663Z
---

**What.** Every local and national press outlet has an owner who is a full person with no cash, a living cost of zero and no income of any kind. In the played world (`buildBenchWorld`, seeds n1 to n3, 90 days from January 20, 2025) four local newspaper owners in Bay Pines, Florida had $0 on day one and received nothing in 90 days, and the television and national owners are the same. The business engine lets an owner draw profit on a sliding scale from need, and need is read from cash over living cost, so an owner with a living cost of zero never needs and never draws; the outlets also keep their cash below the cushion, so no draw would be made anyway. Give an owner the household a person of their means has: a living cost and savings from their other work or the outlet's draws, so they live on something and the draw rule has a need to read.

**Rules.** Estimate, never UNKNOWN: an owner's savings and living cost start from the real average for their income with its source and spread. An effect is a read, not a record: the owner's draw reads their cash and living cost when it decides. No dice: the draw follows the owner's cash, the outlet's profit and cushion. One model, two tiers: a counted owner draws by the same rule as a full one.

**Done when.** In the played world (`buildBenchWorld`, the drawn places Murphy, Idaho, Timberwood Park, Texas and Bay Pines, Florida with seeds n1 to n3, and one random place) every local press owner holds cash and a living cost on day one and receives money by journal record id within 90 days or its absence is explained by the outlet's profit; a test in src/core2/ names the place and seed and fails on main.

**Files.** src/core2/press-staff.ts, src/core2/modules/press.ts, src/core2/modules/business.ts

**Notes.** TODO

Sent back 2026-10-20 from PR #5050 (branch claude/press-owner-household): the campaign-interview test excludes newly affected owners and staff so it passes; cover their filing eligibility explicitly and preserve interview assertions; finish on that branch, merge main into it first.

**Notes.** Found Oct 18 (claude, claude/jobless-no-income-s6) while classifying the households that took in nothing in 90 days (world-jobless-households-no-income). Owners are made by `hireStaffMember` with `fillInIdentity` and no opening cash or living cost (stopgap SG-PEOPLE-press-staff-households); "an owner holds the outlet and draws no pay" in its comment. National outlets' owners sit outside the town's economy by design (SG-PEOPLE-press-national-payroll). Related: `world-press-outlet-revenue-wage-gap`, whose margin sets the profit an owner could draw.

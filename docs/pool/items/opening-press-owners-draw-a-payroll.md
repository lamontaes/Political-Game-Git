---
id: opening-press-owners-draw-a-payroll
title: "A press outlet's owner draws pay from the outlet's payroll, so the household's living cost has an income behind it"
area: people
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: jobs
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
---

**What.** An outlet's owner is seated with a household cost (a livedThrough date they spend out of each week) and no income: the owner role has payParameter null, so the outlet's opening payroll counts only the head and the reporters and no job row pays the owner. The owner's cash runs down with nothing coming in, and the press-owner household test reads their spending as too low. Seen: the outlet owner's card shows a job at their own paper and a paycheck each pay period. Seen: the outlet owner's card shows a job at their own paper and a paycheck each pay period.

**Cause.** Found in code: STAFF_ROLES row "owner" has payParameter null (src/core2/press-staff.ts, line 40 and 127: an owner holds the outlet and draws no pay); the opening payroll sum in src/core2/modules/press.ts (about line 955) adds the head and the reporters only; hireStaffMember gives the owner a livedThrough household cost with no job. A real owner of a paper or station draws a salary or the outlet's profit.

**Fix.** Pay the owner out of the outlet's own books: give the owner role a pay row from the same press parameter table (a sourced owner-operator wage, BLS OES publisher or general manager) and include it in the opening payroll and the opening cash buffer, so the owner's job is a job on the outlet's payroll like the head's. The outlet's money engine (press-money.ts) pays it; no second pay path.

**Time box.** 3 hours

**Rules.** One payroll engine: the owner's job goes through the same payroll the head's does. Every number in the parameter table tagged SOURCED. Registered stopgap for anything not sourced; no new tracking system.

**Done when.** A second session, at a drawn place and seed nobody chose, opens the running game and sees each local outlet's owner with a job record on the outlet's payroll, the outlet's opening cash covering it, and a played year showing the owner paid each pay period from the outlet's books with the household's spending read from that pay. The press-owner-household test passes at three drawn places.

**Waits on.** Nothing.

**Files.** src/core2/press-staff.ts, src/core2/modules/press.ts, src/core2/data/press/staff.json, src/core2/press-owner-household.test.ts

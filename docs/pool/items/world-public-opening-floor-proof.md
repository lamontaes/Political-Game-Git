---
id: world-public-opening-floor-proof
title: "Prove in a played world that a public employer's opening is posted at the public pay floor: six drawn towns opened no public position in a year"
area: world
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr: #5679
after:
blocked-on:
lead: laws
model: opus
effort: high
root: none
source: added with npm run pool -- add
claimed-at:
checked: fable 2026-11-10
---

**What.** The merge audit asked for a played-world test that enacts a public pay floor, lets a public employer (town, county, school) open a position through the jobs engine, hires into it and checks by record id that the hire's pay meets the floor. On Oct 20 six drawn towns (Arbon Valley ID, Port Wing WI, Fairplay GA, Telford PA, Casco ME, Ravenswood WV) opened no position at any public employer in a year after the floor was enacted, so the path the floor hooks (publicPayFloorHourly, read in src/core2/modules/jobs.ts) is not reached in ordinary play at public employers. Find why public staff do not turn over through the jobs engine (budget-set staff, retired templates?) and make a leaver at a public employer open a replacement there, or move the floor to where public pay is really set.

**Cause.** Found in code: the jobs engine never reviews a public employer, so none ever posts a position. `open` in src/core2/modules/jobs.ts (about line 1068) writes an `employers` row only for each organization in `c.finance.businesses`, and later employers join through `registerEmployer`, which business foundings and press outlets call, each with books. Public departments have no business books and never call it. Measured on main d64255aa, Unalakleet, Alaska (0280660, `drawPlace("pubfloor-a", "public-floor")`, `buildBenchWorld`), at the opening and after a played year: the town government, police, fire, public health, the school district (organization:public-schools:...), and the local, state and federal offices all show `book=false` and no employers row. They posted no positions and hired no one in the year. Their leavers left and were not replaced: the state office went from 3 full jobs to 1 (2 left-work), the federal office from 2 to 1, public health from 1 to 0. So `publicPayFloorHourly`, read in `payFor` and `hirePay` in jobs.ts, is reached only by a hire some other route makes. src/core2/public-pay-floor-hire.test.ts proves it for such a hire. The officials' staff route (`startPublicJob` in src/core2/public-payroll.ts, called from src/core2/modules/staff.ts) hires staffers, not department replacements. Public staffing only shrinks, so a public pay floor reaches almost no one.

**Fix.** One route for public hires, through the jobs engine (Replace, never layer). (1) At the opening, give each organization with a public pay authority an `employers` row through `registerEmployer`, with `openingStaff` as its heads. (2) In the employer review, an employer with no business book takes its staffing target from its budget line instead: the staff its line's wage money pays at today's pay, the same share the patrol-hours record (pull request #8230) computes for police. It posts a position for a gap of one or more through the existing posting and hiring code, so `payFor` and `hirePay` apply `publicPayFloorHourly` as they do now. Skip the parts that read a book (sales staff, trading month, loss memory) for such an employer. (3) Leave the officials' staff route as it is: it hires staffers for an official, not department replacements. (4) Extend src/core2/public-pay-floor-hire.test.ts to enact a floor in a drawn place, play until a public employer's leaver is replaced through a posted position, and assert the opening's and the hire's pay meet the floor, by record id. (5) Update SG-GOV-public-pay-floor-owner to what is proven. If (2) needs a ruling on how a department's target follows its line, write it as an owner question in the PR body and build the line-share version.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop. Seen: the bill card's line for who a public pay floor reached, in dollars; today no public employer opens a position so it reaches no one.

**Rules.** No dice. Wire to the world: proven in buildBenchWorld with a drawn place. Replace, never layer: one route for public hires, not a second beside the staff-hire route.

**Done when.** A second session, on main in a drawn place (named in the PR body), plays a year with a public pay floor enacted and sees a public employer's leaver replaced by an opening posted through the jobs engine, and the opening and its hire paid at or above the floor, by record id. A test in src/core2/public-pay-floor-hire.test.ts asserts it, and the text of SG-GOV-public-pay-floor-owner matches what is proven.

**Waits on.** Nothing.

**Files.** src/core2/modules/jobs.ts, src/core2/public-pay-floor-hire.test.ts, src/core2/public-pay-floor.ts, src/core2/public-payroll.ts, src/core2/modules/budgets.ts, src/core2/data/stopgaps/gov.json

**Notes.** Split from release-merge-audit-oct20-morning-fixes fix 3 (PR #5285). Found Oct 20 by claude/political-game-pool-yucp92-aq.

Sent back 2026-10-23 from PR #5679 (branch claude/opening-floor-proof): The public-refill design conflicts with main's staff-hire route and the old owner/date code note remains; the author must reconcile the current engines before this can land. Rechecked unchanged head 139b028f98; exact prior review: https://github.com/lamontaes/Political-Game-Git/pull/5679#issuecomment-6311786454; finish on that branch, merge main into it first.
Stale 2026-10-26: PR #5679 closed (no push since Oct 20, handed back for a design conflict with main's public-pay-floor-hire test); the work is on branch claude/opening-floor-proof; claim the item and merge main into that branch.

Nov 11 (cause finder for Fable B): measured on main d64255aa with a probe outside the repository in Unalakleet, Alaska (seed pubfloor-a). No public employer has an employers row in the jobs engine, because only businesses get one, so public staff never turn over and only shrink.

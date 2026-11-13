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
model: sonnet
effort: high
root: none
source: added with npm run pool -- add
claimed-at:
checked: fable 2026-11-10
---

**What.** The merge audit asked for a played-world test that enacts a public pay floor, lets a public employer (town, county, school) open a position through the jobs engine, hires into it and checks by record id that the hire's pay meets the floor. On Oct 20 six drawn towns (Arbon Valley ID, Port Wing WI, Fairplay GA, Telford PA, Casco ME, Ravenswood WV) opened no position at any public employer in a year after the floor was enacted, so the path the floor hooks (publicPayFloorHourly, read in src/core2/modules/jobs.ts) is not reached in ordinary play at public employers. Find why public staff do not turn over through the jobs engine (budget-set staff, retired templates?) and make a leaver at a public employer open a replacement there, or move the floor to where public pay is really set.

**Cause.** Needs cause. Looked at the item, src/core2/public-pay-floor-hire.test.ts (it proves the floor for a hire, not for an opening) and the `publicPayFloorHourly` calls in `payFor` (src/core2/modules/jobs.ts line 1691) and `hirePay` (line 3632): why public staff never open positions through the jobs engine was never found, and the earlier attempt conflicted with main's staff-hire route. SG-GOV-public-pay-floor-owner (src/core2/data/stopgaps/gov.json) is open.

**Fix.** None until the cause is found.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop. Seen: the bill card's line for who a public pay floor reached, in dollars; today no public employer opens a position so it reaches no one.

**Rules.** No dice. Wire to the world: proven in buildBenchWorld with a drawn place. Replace, never layer: one route for public hires, not a second beside the staff-hire route.

**Done when.** A second session, on main in a drawn place (named in the PR body), plays a year with a public pay floor enacted and sees a public employer's leaver replaced by an opening posted through the jobs engine, and the opening and its hire paid at or above the floor, by record id. A test in src/core2/public-pay-floor-hire.test.ts asserts it, and the text of SG-GOV-public-pay-floor-owner matches what is proven.

**Waits on.** Nothing.

**Files.** src/core2/modules/jobs.ts, src/core2/public-pay-floor-hire.test.ts, src/core2/public-pay-floor.ts, src/core2/data/stopgaps/gov.json

**Notes.** Split from release-merge-audit-oct20-morning-fixes fix 3 (PR #5285). Found Oct 20 by claude/political-game-pool-yucp92-aq.

Sent back 2026-10-23 from PR #5679 (branch claude/opening-floor-proof): The public-refill design conflicts with main's staff-hire route and the old owner/date code note remains; the author must reconcile the current engines before this can land. Rechecked unchanged head 139b028f98; exact prior review: https://github.com/lamontaes/Political-Game-Git/pull/5679#issuecomment-6311786454; finish on that branch, merge main into it first.
Stale 2026-10-26: PR #5679 closed (no push since Oct 20, handed back for a design conflict with main's public-pay-floor-hire test); the work is on branch claude/opening-floor-proof; claim the item and merge main into that branch.

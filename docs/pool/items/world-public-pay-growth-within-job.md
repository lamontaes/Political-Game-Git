---
id: world-public-pay-growth-within-job
title: "A public worker's pay grows within the job by tenure and how they work, held to the government's personnel budget"
area: world
kind: stopgap
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: jobs
model: opus
effort: medium
root: none
source: stand-in triage T4 (Nov 10, 2026), docs/stopgaps/triage-2026-11-10/world.md
claimed-at:
---

**What.** A worker at a town, county or state government gets the yearly move with the place's pay level and nothing for tenure or how well they work, so a public employee's pay never grows within the job the way a private worker's does, and a long-serving clerk earns the same as a new one.

**Cause.** Found in code: src/core2/modules/jobs.ts line 2739 (stopgap SG-WORLD-jobs-public-pay-growth): the within-job raise (`withinJobRaise`, with tenure and work reasons) applies only when the employer has business books (`c.finance.businesses.has`); a public employer takes the else branch at lines 2740 to 2750.

**Fix.** Apply the same `withinJobRaise` rule to public workers, with the raise capped by the room in the government's personnel budget line (read from the budgets engine) or, where a bargaining or pay law in force records a step schedule, set by that schedule. A government with no room gives no raise, and the refusal is recorded with its reason. Resolve the stopgap row.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: the raise follows tenure, work record, the budget line's room and any law in force. One model, two tiers: a counted public worker is read by the same rule, times its count. Wire to the world: a raise moves the payroll posting and the personnel line's spending. Speed: raises are reviewed once a year per worker on their anniversary, never daily.

**Done when.** A second session (not the builder) plays a three-year world (`buildBenchWorld`) in a drawn place (seed named in the PR body) and sees a public worker's recorded pay rise on the anniversary by the rule's tenure and work reasons, the government's personnel line pay for it by journal record id, and a government with no budget room give no raise with the reason recorded. SG-WORLD-jobs-public-pay-growth is resolved.

**Waits on.** Nothing.

**Files.** src/core2/modules/jobs.ts, src/core2/modules/budgets.ts, src/core2/data/stopgaps/world.json, src/core2/jobs.test.ts

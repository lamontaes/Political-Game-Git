---
id: gov-public-sector-bargaining
title: "Public-sector bargaining: a union contract sets a unit's pay with its employer"
area: gov
kind: feature
priority: 2
size: L
status: claimed
claimed-by: claude/public-bargaining
pr: #5415
blocked-on:
milestone:
source: "split from laws-family-bargaining; stopgap SG-GOV-REACH-A-bargaining"
claimed-at: 2026-10-22T00:57:01.126Z
---

**What.** The public-sector bargaining law is a record on public workers, employers and unions; no contract is bargained and no pay changes. Build the smallest bargaining: where the law is in force, a recognized union at a public employer (a police, fire or school unit) negotiates the unit's pay with the employer on a calendar, from the employer's budget line and the union's members' own stances, and the result re-rates the unit's jobs through the core's job re-rate; where the law is not in force there is no contract. A strike is the failure path, and the owner has ruled "Unions and strikes: 1.0" so ask the register before adding one.

**Rules.** No dice; one model, two tiers; an effect is a read (the budget and the payroll read the contract); read the register for the unions ruling.

**Done when.** In a one-year run of a drawn place, a named public worker's pay changes at a contract date by record id, the employer's budget line pays it, and a repeal of the law stops the next contract.

**Files.** a new `src/core2/modules/` engine or the staff engine, `src/core2/law-reach/group-a.ts`, `src/core2/data/`.

**Notes.** Right-to-work (the dues side) is built in `group-a-union.ts`.

Oct 20: Owner ruled that unions, membership rules and strikes wait for 1.0, so #5415's pay-follows-the-budget part may merge without union leverage or strikes, which stay out until 1.0.

Sent back 2026-10-20 from PR #5415 (branch claude/public-bargaining): see the Cloud merger comment on that PR for the exact reason; finish on that branch, merge main into it first.

Sent back 2026-10-21 from PR #5415 (branch claude/public-bargaining): The recorded Oct 20 ruling permits this budget-only phase; deferring union leverage and strikes is not the objection. The required pay proof can still pass without checking a pay change: src/core2/law-reach-bargaining.test.ts:114 falls back to raised[0] when no named-worker sample exists, and lines 119-136 put every actual job/pay-change assertion inside if (f.sampleJobId !== undefined). The counted-only fallback then returns successfully after checking contract fields, without proving the named worker and budget-funded payment required by docs/pool/items/gov-public-sector-bargaining.md:20. Require a nonempty generated-world named-worker/pay-change case tied to the contract, and a real payroll/journal receipt showing the employer budget line paid it by record id. Keep the counted-unit case as additional coverage with its actual pay/flow read checked. The prior owner/date-note repair is present. This is source review; no local gate pass is claimed.; finish on that branch, merge main into it first.

Sent back 2026-10-21 from PR #5415 (branch claude/public-bargaining): The integrated head 070b152c099f5a3f0ced53f8ce710064a522cebf fails the repaired generated-world test before the new cash-receipt assertions: src/core2/law-reach-bargaining.test.ts:185-188 expects the contract line police, but lineForPost(gov.level, sampleJob.id) returns administration. Drawn place 3970520, fresh seed e00476bc7b54c513988b1ade5aed62b7c6f7847eda5c1ae1f62b43cf1b283d5b, named job work-relationship_e1b0dafe4a732e96. The contract therefore has not proved that the employer budget line pays this worker as required by gov-public-sector-bargaining Done when. Correct the generated-job funding/classification path and preserve this drawn regression; do not remove or weaken the line assertion. The named-worker fallback repair is present. I merged current main and plain-pushed, added the missing Contract.since type plus positive/completed payroll-source assertions, then ran typecheck, eslint, changed-file Prettier, zero-dice, release:check and old-imports here (all passed); the changed test failed in 102 seconds. Pool check has the three known unrelated thin-item diagnostics; no merge or passing payroll/repeal proof is claimed. The original body still describes the removed counted-only fallback and should be brought up to date. The owner-approved budget-only phase remains accepted; strikes are not the objection.; finish on that branch, merge main into it first.

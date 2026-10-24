---
id: office-budget-line-schools-raise-hires
title: "A raise to the schools line hires named unemployed adults at the public schools: proved in a drawn place"
area: office
kind: wiring
priority: 3
size: S
status: open
claimed-by:
pr: #5632
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** PR #5588 proved a schools line cut ends teachers' jobs; the raise path (hire from the town's adults without work) is unproved.

**Rules.** An effect is a read not a record; No dice; One rule all 56 places

**Done when.** In a drawn place and seed a mayor's raise to the schools line hires at least one named adult at the district, followed by record id.

**Files.** src/core2/budget-line-schools-staffing.test.ts

**Notes.** TODO

Sent back 2026-10-20 from PR #5632 (branch claude/schools-raise-test): school teachers are counted workers since #5568, so the budget-line-schools-staffing test's named-teacher precondition never holds and it fails in every draw with main merged in; prove the line change on the district's counted payroll; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5632 (branch claude/schools-raise-test): Merging current origin/main conflicts in src/core2/budget-line-schools-staffing.test.ts and src/core2/law-reach/group-a-staffing.ts. Resolve both code conflicts against current main while preserving the counted-teacher hire and layoff proofs, then rerun the changed-file gate. The earlier fix commits are present, but the current merged result cannot be checked until these conflicts are resolved.; finish on that branch, merge main into it first.

Sent back 2026-10-21 from PR #5632 (branch claude/schools-raise-test): The conflict repair preserves the counted-teacher hire and layoff paths, but the body has no Done when evidence table. The item requires a drawn place and seed where a mayors schools-line raise hires at least one named adult at the district, followed by record id. The body mentions an earlier failing Rio Rancho draw with an abbreviated seed and later comments report passing tests without the successful hire id and full reproducible draw. Add that acceptance row with the successful place, full seed and hire/job record id. No local gate pass is claimed here.; finish on that branch, merge main into it first.

Sent back 2026-10-23 from PR #5632 (branch claude/schools-raise-test): group-a-staffing.ts:307 concatenates full candidates before counted candidates instead of ranking one shared list, and :315-316 lays off all full staff before counted staff rather than newest hires across both; prove hiring/layoff order is unchanged by fill-in; finish on that branch, merge main into it first.

Sent back 2026-10-24 from PR #5632 (branch claude/schools-raise-test): integrated group-a-money.ts:46 removes township from governmentFor, so a township-only paid-leave law loses its paying government; restore main township support and its regression, and correct the stale full-candidates-first body description; finish on that branch, merge main into it first.

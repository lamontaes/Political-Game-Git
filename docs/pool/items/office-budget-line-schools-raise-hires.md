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

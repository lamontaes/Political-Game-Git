---
id: gov-council-election-method
title: "Council election method from place data"
area: gov
kind: wiring
priority: 2
status: done
claimed-by:
pr: #4473
blocked-on:
milestone:
source: "owner rulings, Oct 15 afternoon (docs/coordination/OWNER-DECISIONS.md)"
claimed-at:
---

**What.** Each place's council or board is elected the way its own records say (at-large, by district, or mixed). Where the repository has no record, estimate at-large with a per-world spread, marked as an estimate with its source. "Wards" is used only where a place's own records use it. State House districts stay the district meaning for state races.

**Rules.** No dice; an effect is a read; one rule, all 56 places; the chain is the acceptance. Estimate, never unknown.

**Done when.** Drawn places show their election method from data or a marked estimate; the council election engine reads it, by record id. Shown in a played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, with the test named and the record ids that prove it.

**Files.** src/rules election files; place data

**Notes.** CTO ruling: OWNER-DECISIONS.md, Oct 15 afternoon.

Sent back 2026-10-16 from PR #4473 (branch claude/gov-council-election-method): merging main conflicts in src/core2/modules/voting.ts (code or data, left for the author); resolve and push; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4473 (branch claude/gov-council-election-method): Sent back by the merger: merging main conflicts in src/core2/modules/voting.ts (code or data, left for the author); resolve and push Finish on this branch (merge main into it first), then it goes back in line; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4473 (branch claude/gov-council-election-method): The new councilElectionMethod fallback assigns district seats from a fixed population rank when no charter is compiled, while OWNER-DECISIONS.md line 207 already rules that unrecorded councils are estimated as at-large with a per-world spread. The PR body acknowledges choosing the different survey allocation. Follow the recorded ruling rather than leaving that interpretation open; also change gov-ward-map-from-dwellings to resolve and retain SG-GOV-ward-map instead of instructing a later builder to delete its row; finish on that branch, merge main into it first.

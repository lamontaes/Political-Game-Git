---
id: gov-world-standins-oct14
title: "Government and economy stand-ins replaced or removed (#4146)"
area: gov
kind: stopgap
priority: 2
status: open
claimed-by:
pr: #4146
blocked-on:
milestone:
source: "open PR #4146"
claimed-at:
---

**What.** Government and economy stand-ins replaced or removed (#4146). This work was sent back by the merger on 2026-10-16 and is open for any builder to finish. The reason it came back: merging main conflicts in src/core2/data/campaigns/parameters.json, src/core2/data/housing/housing.json, src/core2/data/jobs/parameters.json, src/core2/data/laws/reach-group-a-parameters.json, src/core2/data/laws/reach-group-a.json, src/core2/data/laws/reach-group-b.json, src/core2/data/macro/parameters.json, src/core2/data/moves/parameters.json, src/core2/electorate-inputs.ts, src/core2/governor-priorities.test.ts, src/core2/housing-property-tax.ts, src/core2/housing.test.ts, src/core2/jobs-benefits.ts, src/core2/law-reach-group-a.test.ts, src/core2/law-reach-group-b.test.ts, src/core2/law-reach/group-a-money.ts, src/core2/law-reach/group-a.ts, src/core2/law-reach/group-b.ts, src/core2/modules/budgets.ts, src/core2/modules/campaigns.ts, src/core2/modules/candidacy.ts, src/core2/modules/credit.ts, src/core2/modules/elections.ts, src/core2/modules/executive.ts, src/core2/modules/housing.ts, src/core2/modules/jobs.ts, src/core2/modules/moves.ts, src/core2/modules/offices.ts, src/core2/modules/outcome-web.ts, src/core2/modules/place-prices.ts, src/core2/modules/recalls.ts, src/core2/modules/renewal.ts, src/core2/modules/staff.ts, src/core2/modules/voting.ts, src/core2/moves.test.ts, src/core2/tooling/macro-proof.ts, src/core2/two-level-elections.test.ts (code or data, left for the author); resolve and push. Finish it on the existing branch stopgaps/gov-world, after merging main into it with a plain merge.

**Rules.** Follow the standing rule "Replace, never layer" and the other standing rules in AGENTS.md; merge main into the branch with a plain merge and never force-push. A release declaration in docs/release/changes/ and a gate line at the top of the PR body stay required before the merger takes it again.

**Done when.** The reason above is fixed on the branch, the changed-file tests pass in a drawn place and the branch merges cleanly with main, the PR body carries its gate line, and the merger can merge the pull request without sending it back again.

**Files.** docs/pool/items/gov-world-standins-oct14.md and the files that pull request #4146 changes on stopgaps/gov-world

**Notes.** Read the PR body and any CTO comment first.

Sent back 2026-10-16 from PR #4146 (branch stopgaps/gov-world): merging main conflicts in src/core2/data/campaigns/parameters.json, src/core2/data/housing/housing.json, src/core2/data/jobs/parameters.json, src/core2/data/laws/reach-group-a-parameters.json, src/core2/data/laws/reach-group-a.json, src/core2/data/laws/reach-group-b.json, src/core2/data/macro/parameters.json, src/core2/data/moves/parameters.json, src/core2/electorate-inputs.ts, src/core2/governor-priorities.test.ts, src/core2/housing-property-tax.ts, src/core2/housing.test.ts, src/core2/jobs-benefits.ts, src/core2/law-reach-group-a.test.ts, src/core2/law-reach-group-b.test.ts, src/core2/law-reach/group-a-money.ts, src/core2/law-reach/group-a.ts, src/core2/law-reach/group-b.ts, src/core2/modules/budgets.ts, src/core2/modules/campaigns.ts, src/core2/modules/candidacy.ts, src/core2/modules/credit.ts, src/core2/modules/elections.ts, src/core2/modules/executive.ts, src/core2/modules/housing.ts, src/core2/modules/jobs.ts, src/core2/modules/moves.ts, src/core2/modules/offices.ts, src/core2/modules/outcome-web.ts, src/core2/modules/place-prices.ts, src/core2/modules/recalls.ts, src/core2/modules/renewal.ts, src/core2/modules/staff.ts, src/core2/modules/voting.ts, src/core2/moves.test.ts, src/core2/tooling/macro-proof.ts, src/core2/two-level-elections.test.ts (code or data, left for the author); resolve and push; finish on that branch, merge main into it first.

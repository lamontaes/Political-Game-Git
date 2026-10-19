---
id: gov-standins-elections
title: "Elections, offices, campaigns and recalls stand-ins replaced or relabeled as sourced estimates"
area: gov
kind: stopgap
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The elections, offices, campaigns and recalls areas still hold open stand-ins in src/core2/data/stopgaps.json (for example SG-GOV-who-runs-stand-in, SG-GOV-recall-signature-groups, SG-GOV-filing-deadline-estimate, SG-GOV-ballot-order-estimates, SG-GOV-special-election-timing and SG-GOV-campaign-pollster-seller). Redo them one area at a time against main's current files, as the closed branch stopgaps/gov-world did against an older main. Each row ends replaced by the real mechanic, or relabeled as an ESTIMATED value with its source and spread where the mechanic is the game's simple version.

**Rules.** Placeholders: a stand-in row closes only by a replacement or by a labeled estimate with its source and spread, never by deleting the row alone. Replace, never layer: the old marker and its wording are deleted in the same change, and the PR body counts them. Look before you ask: read docs/coordination/DECISION-REGISTER.md and OWNER-DECISIONS.md and search docs/ before registering or reopening anything.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a place drawn from all 56 and a seed the builder did not choose (name both in the PR body), each row handled in the change is resolved in stopgaps.json with a one-line resolution, its marker call is gone from the code, the test named for the row passes (tests beside elections.test.ts, campaigns.test.ts and recalls.test.ts), and the tripwire tests pass.

**Files.** src/core2/modules/elections.ts, src/core2/modules/voting.ts, src/core2/modules/campaigns.ts, src/core2/modules/recalls.ts, src/core2/data/stopgaps.json

**Notes.** Replaces the elections share of PR #4146 (branch stopgaps/gov-world), which is 7,000 commits behind main and cannot be merged. About 18 election rows were open on Oct 19. Do not close a row that main still depends on (fileStandingCandidates in voting.ts still files local incumbents and challengers).

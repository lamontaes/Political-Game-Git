---
id: gov-standins-housing
title: "Housing-engine stand-ins replaced or relabeled as sourced estimates"
area: world
kind: stopgap
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The housing engine still holds open stand-ins (SG-WORLD-housing-landlord, -vacancy, -counted-rent, -new-home-buyers, -eviction-steps, -foreclosure-steps, -county-estimate, -shelter-beds-state-rate and -shelter-territory in src/core2/data/stopgaps.json). Redo them one at a time against main's current files, as the closed branch stopgaps/gov-world did against an older main. Each row ends replaced by the mechanic, or relabeled as an ESTIMATED value with its source and spread, with eviction steps read from each state's statute row.

**Rules.** Placeholders: a stand-in row closes only by a replacement or by a labeled estimate with its source and spread, never by deleting the row alone. Replace, never layer: the old marker and its wording are deleted in the same change, and the PR body counts them. Look before you ask: read docs/coordination/DECISION-REGISTER.md and OWNER-DECISIONS.md and search docs/ before registering or reopening anything. One model, two tiers: counted households meet the same rule as full ones times their count.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a place drawn from all 56 and a seed the builder did not choose (name both in the PR body), each row handled is resolved in stopgaps.json with a one-line resolution and its marker gone, a named household's eviction or move is shown by record id, and src/core2/housing.test.ts, housing-construction.test.ts and the tripwire tests pass.

**Files.** src/core2/modules/housing.ts, src/core2/housing-construction.ts, src/core2/housing-property-tax.ts, src/core2/data/housing/housing.json, src/core2/data/stopgaps.json

**Notes.** Replaces the housing share of PR #4146. The eviction steps (hearing days, stay days) per state were researched there: 26 states from statute text, 30 estimated.

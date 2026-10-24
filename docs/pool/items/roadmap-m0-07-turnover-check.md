---
id: roadmap-m0-07-turnover-check
title: "M0-07's command checks circle turnover over three played years against a sourced study"
area: people
kind: feature
priority: 2
size: S
status: claimed
claimed-by: claude/quirky-ride-vrwwz4-circle-turnover
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T15:25:34.409Z
---

**What.** Roadmap M0-07 ends 'over years, circle turnover matches a sourced study', and nothing checked it. PR #5913 adds a check that plays three years of the bench world and asks how many of each adult full person's five closest ties on the first day are still among their five closest at the end, against Mollenhorst, Volker and Flap (2014), and makes it part of M0-07's command. The check fails on a real gap, which stays open in people-circle-turnover-too-low; the original acceptance stays open in people-circle-turnover-over-years.

**Rules.** Research before building: the band is SOURCED from the fetched study with its spread, and it checks the town's total, never one person's ties. Never loosen the band to pass; a check that fails on a real gap merges as the guard with the flag false.

**Done when.** M0-07's command runs the turnover check after its existing test; the check reports the pooled share kept with place, key and full seed and exits nonzero outside the sourced band; the research row cites the study's page; the PR body names the cause of the gap by file and line from a probe; people-circle-turnover-over-years and people-circle-turnover-too-low stay open.

**Files.** src/core2/tooling/m0-07-turnover-check.ts, src/core2/circle-turnover-check.ts, data/research/people/mollenhorst-2014-network-turnover.json, docs/roadmap/features.json

**Notes.** TODO

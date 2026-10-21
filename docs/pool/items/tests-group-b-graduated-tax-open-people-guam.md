---
id: tests-group-b-graduated-tax-open-people-guam
title: "law-reach-group-b.test fails once in a while in Hagåtña, Guam: a graduated-income-tax policy leaves an open person row"
area: world
kind: bug
priority: 3
size: S
status: claimed
claimed-by: claude/group-b-guam-flake
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T00:57:57.521Z
---

**What.** law-reach-group-b.test.ts failed once with "governments federal/state us-policy-positions:fiscal.graduated-income-tax people: expected [ { …(9) } ] to deeply equal []" in Hagåtña, Guam (seed f416785a012550e33f36eb2007bf4d1aa67222220b2719c0042bcba47b5f406b), and passed on the next run with a different draw. A graduated-income-tax policy that should write nothing about people left an open reach row for a person. Reproduce with that seed and place, find which handler wrote the row, and fix the cause.

**Rules.** An effect is a read: a policy that reaches no one must not record a person row. One rule, all 56 places: the check draws a place and names the seed.

**Done when.** The group B test, run with the seed and place above and then in a freshly drawn place of the played world (buildBenchWorld), passes with no open person row for the graduated-income-tax policy, shown by the openPeople assertion in src/core2/law-reach-group-b.test.ts.

**Files.** src/core2/law-reach-group-b.test.ts, src/core2/law-reach/group-b.ts

**Notes.** Found Oct 20 while testing the keyed-benefit change (PR #5356); it did not reproduce on the rerun, so it may predate that change.

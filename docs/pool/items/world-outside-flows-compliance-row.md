---
id: world-outside-flows-compliance-row
title: "Closure check 6 fails on a business compliance payment to the outside that has no outside-flows row"
area: world
kind: bug
priority: 2
size: S
status: done
claimed-by:
pr: #4727
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The golden-path money check M0-08 (scripts/core2-year/closures.mjs, check 6) rejects any money owed to the outside world that no recorded exchange matches. In a played year at Sycamore, Georgia (seed 5a5a5a5a) the only unmatched flow is "accounts.transfer compliance": 51 entries, about $14,746 owed to the outside, paid by businesses to an outside account for what a law requires of them (the data privacy duty, modeled in the business engine's compliance table). Add the outside-flows row that names it and the record that matches it, so the check passes and the payment stays visible as an outside flow.

**Rules.** The dollar test rejects any flow with no row, so the row names the matching record; it is not a plug. One rule, all 56 places. No dice.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place with the seed named in the PR body, check 6 of scripts/core2-year/closures.mjs shows no unmatched compliance flow, each compliance transfer matches a row of the business engine's compliance table by transfer id, and the outside-flows data test passes.

**Files.** src/core2/data/outside-flows.json, src/core2/modules/business.ts

**Notes.** Found running the golden-path suite on Oct 16.

Sent back 2026-10-16 from PR #4727 (branch claude/world-outside-flows-compliance): GitHub refuses to merge a draft pull request (HTTP 405: "Pull Request is still a draft"). The merger skill's prescribed REST ready-for-review endpoint returns HTTP 404. Mark this PR ready for review, retain the named changed-file checks at the top, and push any needed corrections; finish on that branch, merge main into it first.

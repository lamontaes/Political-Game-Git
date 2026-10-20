---
id: world-outcome-links-sizes
title: "The unsized outcome links get a researched size"
area: world
kind: research
priority: 2
size: M
status: open
claimed-by:
pr: #5207
blocked-on:
source: "split from core-stopgap-outcome-web-faked-mechanic (SG-WEB-outcome-drift), Oct 15"
claimed-at:
---

**What.** 41 of the outcome web's researched links have no size (`size-not-set`), plus nine person-level ones, so they cannot move their outcome. Read each link's source, set its effect size with a spread and a lag, and mark it SOURCED or ESTIMATED in `data/research/outcome-web/links.json`. Links whose research gives no size stay unbuilt with the reason written. The links include: police to low-level arrests, class size to scores, eviction to homelessness, broadband to employment, new apartments to nearby rent and graduation to earnings.

**Rules.** Research before building: real data calibrates the size and never decides one person's outcome. Estimate, never UNKNOWN: a size starts from the real average with a per-world spread and its source.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, seed named in the PR body) a sized link moves its outcome after its cause changes, shown by the link key, the cause record id and the web's month record id, and the unbuilt count in links.json falls by the number sized; the test in src/core2/outcome-web.test.ts passes.

**Files.** data/research/outcome-web/links.json, src/core2/outcome-web.test.ts

**Notes.** Split from core-stopgap-outcome-web-faked-mechanic. Source: the 41 `size-not-set` links, e.g. police-to-low-level-arrests, class-size-to-scores, eviction-to-homelessness.
Sent back 2026-10-20 from PR #5207 (branch claude/outcome-sizes-g08lgv): Merge conflict with main in docs/pool/items/world-water-violations-producer.md; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5207 (branch claude/outcome-sizes-g08lgv): see the Cloud merger comment on that PR for the exact reason; finish on that branch, merge main into it first.

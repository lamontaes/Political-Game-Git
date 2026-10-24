---
id: gov-played-world-counted-voters-red
title: "Golden path M0-13: counted voters do not vote in local races on some drawn places"
area: gov
kind: bug
priority: 1
size: S
status: claimed
claimed-by: claude/quirky-ride-vrwwz4
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T00:37:13.365Z
---

**What.** CI's golden-path-year job on PR 5647 failed the M0-13 assertion 'counted voters vote in local races' in tests/golden-path/played-world.node-test.ts, on Randall, Kansas (place key 2058450, seed 1f131a5a). A merger check on Oct 23 found the same failure on clean main, so it is not that PR's. Find why the counted tier casts no votes in that place's local races in a played year, whether no local race is held, the counted voter groups are not eligible, or the vote count skips them, and fix it at the root.

**Rules.** One model, two tiers: a counted voter group votes by the same rule as a full person, times its count. One rule, all 56 places: the assertion holds for any drawn place, never a named one.

**Done when.** tests/golden-path/played-world.node-test.ts passes M0-13 on Randall, Kansas (seed 1f131a5a) and on three more places drawn from all 56 with seeds the builder did not choose, each named in the PR body.

**Files.** tests/golden-path/played-world.node-test.ts, src/core2/modules/voting.ts, src/core2/modules/elections.ts

**Notes.** TODO

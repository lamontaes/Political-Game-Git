---
id: people-abortion-provider-distance
title: "Miles to the nearest abortion provider come from the place, not two national averages"
area: people
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr: #5749
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** SG-PEOPLE-unplanned-provider-distance: renewal reads two national averages (restricted and open) for the trip to a provider. Source a place-level distance for all 56 places and read it in decideUnplanned.

**Rules.** No dice. One rule, all 56 places. No hand-written player text. Replace, never layer.

**Done when.** In a drawn place (named in the PR body) the trip in an unplanned decision comes from a sourced per-place table with a spread, the stopgap row is resolved, and src/core2/renewal.test.ts shows the miles by record id.

**Files.** src/core2/births-unplanned.ts, data/research/people/, src/core2/data/stopgaps.json

**Notes.** Split from people-unplanned-pregnancy-decision (PR for claude/political-game-pool-yucp92-bg).

Sent back 2026-10-20 from PR #5749 (branch claude/provider-distance): src/core2/renewal.test.ts:34-107 imports the parent test that permits zero unplanned plans, guards its couple checks with if (couple), and uses if (waiting.length) plus a nonnegative-payment assertion. Do not ship those vacuous checks: require a nonempty witnessed case with bounded redraws and positive actual trip payment where asserted. docs/release/changes/people-abortion-provider-distance.md:3-6 says impact none because no screen shows it, but births-unplanned.ts reads these miles to change travel cost and the continue/end decision, and renewal.ts transfers real cash; declare the actual simulation change accurately. This PR also includes #5695, which remains sent back; merge its fixing commit first or base this fixer on its branch so the unresolved parent is not silently merged.; finish on that branch, merge main into it first.

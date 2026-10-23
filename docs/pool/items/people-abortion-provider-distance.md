---
id: people-abortion-provider-distance
title: "Miles to the nearest abortion provider come from the place, not two national averages"
area: people
kind: feature
priority: 3
size: M
status: in-pr
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

Sent back 2026-10-22 from PR #5749 (branch claude/provider-distance): The inherited full-tier test still relies on manually seeded exposure instead of requiring an ordinary produced pregnancy, and its parent declaration still labels real simulation effects as none.; finish on that branch, merge main into it first.

Sent back 2026-10-23 from PR #5749 (branch claude/provider-distance): The earlier test repairs are present, but data/research/people/abortion-provider-distance.json:18-30 tags the Alaska row SOURCED while its quote only defines distance_origintodest; it contains none of the reported 64.6/121.1-mile means or 1.6/230.3/565.5 bounds. The same definition-only quote is used in all 51 SOURCED rows. The note says these are weighted means and 10th/90th percentiles computed from county data, with alternate population weights in two states; these are not numbers quoted from the cited guide, and this diff contains no reproducible aggregation to audit them. Supply numeric source evidence and reproducible input/weight/aggregation provenance for derived values, or label estimates accurately with their source and spread; do not present derived intervals as published ones. The 56-place release-note count matches the 56 rows, but that does not establish their values. No local gate pass is claimed for this source review.; finish on that branch, merge main into it first.

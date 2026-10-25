---
id: people-unplanned-counted-tier
title: "Counted women follow the unplanned-pregnancy rule times their count"
area: people
kind: feature
priority: 3
size: M
status: in-pr
claimed-by:
pr: #5757
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** Only full people in couples are covered by the unplanned-pregnancy exposure. Counted women need the same rule times their count (one model, two tiers).

**Rules.** No dice. One rule, all 56 places. No hand-written player text. Replace, never layer.

**Done when.** In a drawn place a counted group's unplanned pregnancies and decisions match the rule applied to full women, shown in src/core2/renewal.test.ts.

**Files.** src/core2/modules/renewal.ts, src/core2/births-unplanned.ts

**Notes.** Split from people-unplanned-pregnancy-decision (PR for claude/political-game-pool-yucp92-bg).

Sent back 2026-10-20 from PR #5757 (branch claude/unplanned-counted-tier): The new counted regression requires a delivered counted birth, which is useful, but this PR also imports the still-unfixed full-tier test from #5695/#5749. In src/core2/renewal.test.ts:34-107, plans may be empty, the only direct full-couple assertions are inside if (couple), the positive-plan assertion is inside if (waiting.length), and the payment check accepts paidMinor >= 0. Thus the purported full-tier side can check no pregnancy or payment at all; manually writing exposure carry is not the ordinary generated-world producer proof. Keep the counted case, repair the inherited full-tier test with bounded applicable draws and nonempty positive plan/payment assertions, and retain the player-household exclusion. The item asks for the counted rule matching the full rule, so an unchecked full side does not supply that comparison.; finish on that branch, merge main into it first.

Sent back 2026-10-22 from PR #5757 (branch claude/unplanned-counted-tier): The full-tier test manually seeds exposure after the played year and never requires a naturally produced full-tier pregnancy; retain the positive payment fixture and add a nonempty ordinary-producer case.; finish on that branch, merge main into it first.

Sent back 2026-10-23 from PR #5757 (branch claude/unplanned-counted-tier): The earlier test repairs are present, but data/research/people/abortion-provider-distance.json:18-30 tags the Alaska row SOURCED while its quote only defines distance_origintodest; it contains none of the reported 64.6/121.1-mile means or 1.6/230.3/565.5 bounds. The same definition-only quote is used in all 51 SOURCED rows. The note says these are weighted means and 10th/90th percentiles computed from county data, with alternate population weights in two states; these are not numbers quoted from the cited guide, and this diff contains no reproducible aggregation to audit them. Supply numeric source evidence and reproducible input/weight/aggregation provenance for derived values, or label estimates accurately with their source and spread; do not present derived intervals as published ones. The 56-place release-note count matches the 56 rows, but that does not establish their values. No local gate pass is claimed for this source review.; finish on that branch, merge main into it first.

Sent back 2026-10-23 from PR #5757 (branch claude/unplanned-counted-tier): place-level pooled exposure funds another woman's pregnancy unlike the full tier's per-couple balance; retain per-woman/couple exposure ownership times household weight and prove timing across fill-in; finish on that branch, merge main into it first.

Sent back 2026-10-24 from PR #5757 (branch claude/unplanned-counted-tier): per-woman carry is repaired but the main-targeting stack still carries the parent’s unmeasured decision/travel coefficient gap tied to a resolved owner row; incorporate the parent calibration registration/evidence correction, retaining carry/fill-in proof; finish on that branch, merge main into it first.

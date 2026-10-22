---
id: people-unplanned-counted-tier
title: "Counted women follow the unplanned-pregnancy rule times their count"
area: people
kind: feature
priority: 3
size: M
status: open
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

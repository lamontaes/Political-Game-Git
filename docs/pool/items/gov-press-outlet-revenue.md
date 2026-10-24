---
id: gov-press-outlet-revenue
title: "An outlet earns from its audience's subscriptions and from local businesses that choose to advertise"
area: gov
kind: stopgap
priority: 1
size: M
status: claimed
claimed-by: claude/press-outlet-revenue
pr: #5099
blocked-on:
source: "gov-stopgap-press-faked-mechanic, PR #4596"
claimed-at: 2026-10-24T10:11:43.276Z
---

**What.** An outlet's revenue is one standing monthly payment from the town's outside customers, sized at the opening from its audience and a per-follower amount by kind. Local businesses buy no ads, households' own reading spending still goes to the outside account, and the payment does not follow the audience as it grows or shrinks (stopgap SG-PEOPLE-press-outlet-revenue). Make the outlet earn from its audience's subscriptions and from local businesses that choose to advertise, each a payment from a named payer's own account, and delete the standing payment in the same change.

**Rules.** No dice: advertising and subscriptions follow readers' choices and businesses' cash and goals, never a fixed payment. An effect is a read, not a record: the revenue reads the audience at payment time. One model, two tiers: the counted audience subscribes by the same rule as a full reader times their count. Replace, never layer: the standing outside payment is deleted. Estimate, never UNKNOWN: an ad price with no source starts from the real average marked ESTIMATED with spread. Speed: revenue settles monthly from the audience count.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, an outlet's revenue rises and falls with its audience and includes a named local business's ad payment, shown by transfer id, and the stopgap row closes. Tests in src/core2/press.test.ts and a new src/core2/press-money.test.ts. The owner plays it: he sees a local paper run an ad from a shop he knows.

**Files.** src/core2/modules/press.ts, src/core2/press-money.ts, src/core2/data/press/parameters.json, src/core2/data/stopgaps.json

**Notes.** The revenue half of gov-stopgap-press-faked-mechanic. Local advertising needs businesses that choose to advertise, which the business engine does not model yet; that may need its own item first.

Sent back 2026-10-23 from PR #5099 (branch claude/press-outlet-revenue): The 45-day/helper-only revenue proof does not supply the required annual audience-change and named local advertising-payer chain; the broader stopgap remains open. Rechecked unchanged head 9678cefc3d; exact prior review: https://github.com/lamontaes/Political-Game-Git/pull/5099#issuecomment-6328540445; finish on that branch, merge main into it first.

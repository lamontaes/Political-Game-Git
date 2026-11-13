---
id: release-audit-15-energy-cost-year
title: "Share one rule between businessEnergyCostYear and the price-law table (#5278)"
area: world
kind: bug
priority: 3
size: S
status: merged
claimed-by: claude/pool-release-audit-15-energy-cost-year
pr: #8705
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-11T06:25:54.141Z
standard: 2
model: sonnet
effort: medium
root: none
lead: laws-effects
after:
checked: fable 2026-11-10
branch: claude/pool-release-audit-15-energy-cost-year
merged-at: 2026-11-12T22:00:34.734Z
---

**What.** businessEnergyCostYear works out what a law that prices energy would cost a business over a year. It keeps its own small table of the clean-electricity and carbon-price rows, while the monthly settlement reads the same two laws from the PRICE_LAWS table, so the two can drift apart. Make the year cost read the one rule the settlement reads, and prove with a test that the year cost equals twelve months of the settlement. Also decide on purpose that employers without books never organize, and write that decision in the item notes. Seen: the yearly energy cost a clean-electricity or carbon-price law puts on a business, in the law's reach card, which must equal twelve months of what the business pays.

**Cause.** Found in code: src/core2/modules/place-prices.ts, function `businessEnergyCostYear` (line 1123), rebuilds the clean-electricity and carbon-price rows in a local `rule` table beside the `PRICE_LAWS` table (line 925) that the monthly settlement uses.

**Fix.** Make `businessEnergyCostYear` read the same price-law rule the monthly settlement uses and delete the local rule table. Add a test in a drawn place that the year cost equals twelve months of the settlement. Write the decision on employers without books (never organize, on purpose) in the item notes.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** Replace, never layer: the fix replaces the faulty code in the same change, and a test asserts the feature and fails when nothing is found. One engine per mechanic: the year cost and the monthly settlement read one price-law rule, not two copies.

**Done when.** A second session, in a drawn place and seed named in the PR, computes a business's year cost with businessEnergyCostYear and the sum of twelve monthly settlements for the same law and finds them equal, and src/core2/place-prices.test.ts holds that comparison and fails when the two rules differ. The decision on employers without books is written in the item notes.

**Waits on.** Nothing.

**Files.** src/core2/modules/place-prices.ts, src/core2/place-prices.test.ts, src/core2/modules/interest-groups.ts

**Notes.** Item 15 of docs/reports/merge-audit-2026-10-20.md, split from release-merge-audit-oct20-fixes. Released from idle draft #5180 by the CTO, Oct 26.

Lane 5 (pool truth, Nov 3): the item was open but still named an old claim, `claude/political-game-pool-76ksvw` (2026-10-20). Cleared from the front matter and kept here.

Claimed by next for sonnet-2698 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 06:25 UTC) on branch claude/pool-release-audit-15-energy-cost-year.

**Decision (sonnet-2698, Nov 11): employers without books never organize, on purpose.** An energy-pricing law is costed by a business's book: `interest-groups.ts` reads `book?.annualOtherCostsMinor ?? 0` for the employers a bill binds (line 262), so an employer with no finance book is costed at 0 and has nothing to organize over, and the monthly settlement (`place-prices.ts`, the loop over `c.finance.businesses`) charges such an employer nothing either, so the year cost and the settlement agree there. Nothing was added to give a bookless employer a made-up cost; if one should pay, that is a book, not a guess in this function.

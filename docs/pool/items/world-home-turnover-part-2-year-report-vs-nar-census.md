---
id: world-home-turnover-part-2-year-report-vs-nar-census
title: "A played year reports home sales, purchases and first-time-buyer share beside NAR and Census"
area: world
kind: research
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after: world-home-turnover-part-1-measure-sales-now, world-counted-renters-buy, world-buyer-pays-the-selling-household, world-home-sales-set-the-town-price
blocked-on:
lead: laws-effects
model: sonnet
effort: low
root: design-one-model-two-tiers
source: split from world-home-turnover in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** Once the pieces of world-home-turnover are built (sales from reasons, buyers taking listed homes, the price index reading sales), measure a played year: sales and purchases per thousand owner households in a drawn place, the first-time-buyer share, beside about 5 percent of owner-occupied homes changing hands (NAR existing-home sales against the Census owner-occupied stock). The check compares totals only. It never picks any household's outcome, and a gap is filed as a pool item only if nothing in the world explains it.

**Cause.** Design: docs/coordination/OWNER-DECISIONS.md, Nov 8 morning (ranges are not targets for anything) and the parent item world-home-turnover (the NAR and Census figures, Oct 17).

**Fix.** Add the year report (rate, first-time-buyer share, place and seed) to the dev tests or the housing test, and file a pool item for any gap nothing in the world explains.

**Time box.** 3 hours for one session of the Sonnet model. When it runs out, push what passes, set the state honestly with a one-line note, and stop. Feeds: world-home-turnover (a held item that waits on it); the year's sales count beside the real rate.

**Rules.** No dice: the real rate checks totals, it never decides one household's outcome. Estimate, never UNKNOWN: the figures carry their source and spread. One run, one number: a single run per place, no repeat medians. Real figures are reported, never targets (owner, Nov 8).

**Done when.** A second session (not the builder) plays a one-year world (`buildBenchWorld`, a drawn place from all 56, seed named in the PR body) and sees home sales and purchases by record id with the rate per thousand owner households and the first-time-buyer share reported beside the NAR and Census figures, a named sale traced from the seller's reason to the buyer's mortgage and the town's price record, and a test in src/core2 naming the place and seed.

**Waits on.** world-home-turnover-part-1-measure-sales-now, world-counted-renters-buy, world-buyer-pays-the-selling-household, world-home-sales-set-the-town-price.

**Files.** src/core2/modules/housing.ts, src/core2/data/housing/parameters.json, src/core2/housing.test.ts

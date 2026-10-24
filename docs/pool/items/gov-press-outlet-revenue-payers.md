---
id: gov-press-outlet-revenue-payers
title: "An outlet's revenue is paid by its readers' households and the town's businesses, named, and follows its audience"
area: gov
kind: stopgap
priority: 1
size: M
status: in-pr
claimed-by: claude/press-outlet-revenue
pr: #5099
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T15:32:14.104Z
---

**What.** The money half of gov-press-outlet-revenue. An outlet's revenue was one standing monthly payment from the town's outside customers (stopgap SG-PEOPLE-press-outlet-revenue). Replace it with subscriptions paid from reader households' own living costs (the counted households by the same rule, times their readers) and ads the town's businesses buy out of their own costs on a sliding scale to their cash, split by audience, and delete the standing payment.

**Rules.** No dice: subscriptions follow who reads, ads follow businesses' costs and cash. One model, two tiers: counted readers pay by the full readers' rule times their count. Replace, never layer: the standing outside payment is deleted. Estimate, never UNKNOWN: every new number is sourced or ESTIMATED with its spread. Speed: no more than 20 percent slower than base.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, a local paper's subscription revenue rises in a month its readers rise and falls in one they fall, a named reader household's payment to it and a named local business's ad payment to it are shown by journal receipt and transfer id, and SG-PEOPLE-press-outlet-revenue is resolved; tests in src/core2/press-money.test.ts; npm run speed:year for D.C. within 20 percent of main.

**Files.** src/core2/press-money.ts, src/core2/modules/press.ts, src/core2/living-cost-split.ts, src/core2/press-money.test.ts, src/core2/data/press/parameters.json, src/core2/data/stopgaps.json

**Notes.** Split from gov-press-outlet-revenue on the merger's Oct 24 return of #5099: the money step is done there; the parent keeps the owner-plays-it line, which needs a paper screen (play-paper-shows-local-ads).

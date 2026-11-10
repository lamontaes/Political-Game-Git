---
id: laws-adopted-income-tax-learning
title: "An adopted income tax reaches the existing learned-law reader after actual withholding"
area: laws
kind: wiring
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws-effects
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
source: added with npm run pool -- add
claimed-at:
---

**What.** A naturally voted income tax in Meadow Lakes changes named workers' cash, but payroll withholding only writes payment and applied records. The existing monetary-law learning reader handles price rules and does not receive this tax payment. Connect the successful withholding to that same reader, preserving the actual tax posting and the law that caused it; attribution must require a story the payer actually heard. Exact example: Ryan Carr paid 2284 cents of HB 2 state tax in journal:2025-05-20:39812, and the same treasury paid Donna Summers in journal:2025-05-22:39986.

**Cause.** Found in code: `withholdPay` in src/core2/modules/budgets.ts (line 1805) writes the payment and applied records only, while `learnFromStory` and `learnOnHearing` in src/core2/modules/place-prices.ts (lines 587 and 651) are the monetary-law learning reader and take price changes, not a tax payment. Found under laws-end-to-end-proof, whose broader negotiation and failed-bill proof remains open.

**Fix.** Pass the successful withholding to that same learning reader, keeping the posting and the law; the person learns only when they heard a story about the law. Add no second learning engine and no attribution of unrelated federal deductions.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** The chain is the acceptance: a real tax posting must connect to its actual payer, a heard law story, a nonzero stance cause and normal shipping Journal output. No dice, no invented payment, no omniscient knowledge, no duplicate learning engine. Ask why: the stance cites the story the payer heard.

**Done when.** A second session, not the builder, plays the fixed Meadow Lakes played world year at seed f835dd278d7312a1 (a drawn place, Meadow Lakes, Alaska) and follows the naturally voted income-tax bill through an exact named state-tax posting, a heard story, a changed stance and an ordinary Journal line, and sees a named person actually paid from the receiving treasury. Ten fresh generated-world reader controls cover hearing before and after payment and no hearing, the existing price-learning checks still pass, and four-year timing stays within 20 percent of base.

**Waits on.** Nothing.

**Files.** src/core2/modules/budgets.ts, src/core2/modules/place-prices.ts, src/core2/income-tax-learned.test.ts (new)

**Notes.** Bounded missing link found under laws-end-to-end-proof, whose broader negotiation and failed-bill proof remains open. Natural baseline: docs/lanes/proof/meadow-law-chain-investigation.md on lane-2/law-chain-proof. Exact example: Ryan Carr paid 2284 cents of HB 2 state tax in journal:2025-05-20:39812; the same treasury paid Donna Summers in journal:2025-05-22:39986. Actual heard-story observation is queued before a learning-pass claim. Read lane-2 path 2, existing price/benefit learning producers, and laws-nine-links-taxes-ten; searched pool for income tax, withholding, learned, news and stance. No duplicate bounded item found.

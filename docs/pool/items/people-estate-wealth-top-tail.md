---
id: people-estate-wealth-top-tail
title: "No resident's estate is large enough to owe an estate tax, so the estate tax never collects"
area: people
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The taxes family's money pass (laws lead's helper, Oct 25, branch claude/law-wiring-taxes) found that the estate tax settles nothing in any place it ran. Every full person holds at most about $504,000, below every state estate tax exemption and the federal one. The only people above an exemption are state cabinet members ($11M to $60M each), who have no kin, so their estates escheat and are assessed at 0. In Scissors, Texas (seed c887792099075f8c, 640 days) the revenue cabinet member died on 2026-01-04 and probate closed on 2026-10-01 with an estate assessed at 0 (measured). The helper scanned 30 full-year places and 60 more draws. The Survey of Consumer Finances puts about one household in ten at a net worth above $1 million (recalled, not checked). A few states' estate taxes start near there, so some deaths in a larger town should owe it.

**Rules.** Estimate, never UNKNOWN: a resident's wealth starts from the place's real distribution by age and household, with its spread and source. One model, two tiers: counted households carry the same distribution times their count. No dice: who dies follows the existing health records, not a roll.

**Done when.** Full persons' and counted households' opening wealth (cash, home and business) follows the Survey of Consumer Finances by age, including its top tail; and in a played world (`buildBenchWorld`, a drawn place from all 56, seed named) a death leaves an estate above its state's or the federal exemption, and the estate tax's own payment is named by journal id.

**Files.** src/core2/estates.ts, src/core2/modules/residents.ts

**Notes.** Filed by the laws lead, Oct 25, from the taxes helper's report. `core-opening-resident-cash` (done) gave residents opening cash; this is the top of the distribution.

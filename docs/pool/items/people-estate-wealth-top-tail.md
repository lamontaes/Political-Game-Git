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
after:
standard: 2
model: opus
effort: medium
root: design-one-model-two-tiers
lead: laws
---

**What.** The estate tax settles nothing in any place it ran. Every full person holds at most about $504,000, below every state estate tax exemption and the federal one. The only people above an exemption are state cabinet members ($11M to $60M each), who have no kin, so their estates escheat and are assessed at 0. The Survey of Consumer Finances puts about one household in ten at a net worth above $1 million (recalled, not checked), and a few states' estate taxes start near there, so some deaths in a larger town should owe it.

**Cause.** Measured: Scissors, Texas, seed c887792099075f8c, 640 days: the revenue cabinet member died on 2026-01-04 and probate closed on 2026-10-01 with an estate assessed at 0; no full person holds more than about $504,000 (taxes family money pass, 30 full-year places and 60 more draws). Code: src/core2/estates.ts.

**Fix.** Draw opening wealth (cash, home and business) for full and counted people from the Survey of Consumer Finances by age, including the top tail, with its source and spread, in src/core2/modules/residents.ts.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Estimate, never UNKNOWN: a resident's wealth starts from the place's real distribution by age and household, with its spread and source. One model, two tiers: counted households carry the same distribution times their count. No dice: who dies follows the existing health records, not a roll.

**Done when.** A second session runs a played world (buildBenchWorld, a drawn place from all 56, seed named) and sees a death leave an estate above its state's or the federal exemption, with the estate tax's own payment named by journal id; full persons' and counted households' opening wealth follows the Survey of Consumer Finances by age including its top tail, and the share above $1 million is reported beside the survey's.

**Waits on.** Nothing.

**Files.** src/core2/estates.ts, src/core2/modules/residents.ts, src/core2/data/parameters.json

**Notes.** Filed by the laws lead, Oct 25, from the taxes helper's report. `core-opening-resident-cash` (done) gave residents opening cash; this is the top of the distribution.

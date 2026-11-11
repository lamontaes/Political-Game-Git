---
id: laws-nine-links-health-schools
title: "Every health, assistance and schools law passes all nine wiring links in a played year"
area: laws
kind: wiring
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr: #6026
blocked-on:
source: "CTO weekend leads, Oct 24 (PR cto/leads-2026-10-24)"
claimed-at:
after:
lead: laws-effects
model: haiku
effort: low
root: rc8-law-judged-by-paperwork
checked: fable 2026-11-10
---

**What.** Four laws of the health, assistance and schools family are still short of the nine wiring links, as the Oct 26 Notes narrow it: the budget lines healthAndHospitals, schools and higherEducation, which pay nothing under their own law id, and public-funds-for-private-schooling, which reached nobody in Prescott, Michigan. The rest of the family landed through the bounded item laws-nine-links-health-schools-eight (now dropped). A law passes the nine links when it exists in all 56 places, a body can enact and repeal it, it reaches people and organizations, the engine it changes reads it, it moves money between real accounts, it moves its outcome-web measures, people learn of it only by a read, repeal stops it, and one code path serves every place. The first job is to regrade the family on main and say which of the four still fail and why.

**Cause.** Measured: `node --import tsx scripts/law-wiring/check.ts --seed 3f77f7d1d2688e09629641c1c0fa3cc2 --only <the family's keys>` on main 3039a3fa1d (Hettinger, North Dakota, a fresh draw), graded with `scripts/law-wiring/matrix.ts`. `budget-line:healthAndHospitals`, `budget-line:schools` and `budget-line:higherEducation` are wired on all nine links there. They are also wired in main's own `docs/reports/law-wiring-matrix.json`, built from 25 places, so the Oct 26 reason (the treasury change in PR #5669) no longer applies. `public-funds-for-private-schooling` is wired in main's matrix: Uehling, Nebraska pays the voucher (journal:2025-02-22:8265). In Hettinger its money link grades `stopgap`, because Hettinger has no private school. `src/core2/opening-private-tuition.ts` charges tuition only to the families enrolled in a town's private school, and a town without one pays none, so `payVouchers` (`src/core2/law-reach/group-b-money.ts` line 1442) has no tuition contract to pay. That is right. What turns it into `stopgap` is the open row `SG-GOV-REACH-B-voucher-payment`, named at `src/core2/data/laws/reach-group-b.json` line 116. Its text says a voucher pays "the average private tuition each household is already charged ... spread over the town's families". That no longer matches the code, which enrolls the best-off families up to the state's private share (NCES) and pays only them.

**Fix.** Mark `SG-GOV-REACH-B-voucher-payment` resolved in `src/core2/data/stopgaps/gov.json` (never deleted), with a line that `opening-private-tuition.ts` now enrolls families by means and `payVouchers` pays only their tuition. Remove its `stopgapId` from `src/core2/data/laws/reach-group-b.json` (line 116) and the mention in the comment above `payVouchers` (`src/core2/law-reach/group-b-money.ts` line 1439). Nothing else in the family needs building. Proposed: once that lands, the CTO closes the item (`npm run pool -- status laws-nine-links-health-schools done --by=cto`), since every law in it is wired in main's matrix.

**Time box.** 0.5 hours for one Haiku session.

**Rules.** An effect is a read, not a record: the engine that pays or decides reads the law and records whom it applied it to through `lawApplied`. One model, two tiers: counted groups take the same rule as full people, times the count. Ask why: a person attributes a change to the law only after news they received, a conversation, a notice or an ad. The chain is the acceptance: each law is followed to a named person and a dollar.

**Done when.** A second session runs `scripts/law-wiring/check.ts` with `--only us-policy-positions:education.public-funds-for-private-schooling` in a drawn place that has a private school (drawing again until one does, and naming the places passed over, as `drawn-place-tests` says), names the place and seed, and sees the voucher's `lawApplied` row (`private-tuition-voucher-paid`), the payment on the journal and the household reached. It also sees no `SG-GOV-REACH-B-voucher-payment` in the grade of a place without one.

**Waits on.** Nothing.

**Files.** src/core2/data/stopgaps/gov.json, src/core2/data/laws/reach-group-b.json, src/core2/law-reach/group-b-money.ts, src/core2/opening-private-tuition.ts

**Notes.** Split Oct 24 by the CTO from `laws-wiring-every-law` (the lead order: `docs/work-orders/lead-laws-2026-10-24.md`). Family PR state on Oct 23: merged, #5652 and #5732. A PR for this family names this item on line 1 (`Pool item: laws-nine-links-health-schools`) and `Lead: laws` in its body, never the umbrella: family PRs looped because the umbrella's done-when is one no single family can meet, and a bare umbrella id on line 1 closes the umbrella on merge. Merged does not mean nine links: rebuild the matrix on main and finish what the rows still show missing, partial or stopgapped. Open pieces already filed: `laws-medicaid-counted-coverage-unpaid-ainaloa`, `laws-medicaid-medical-debt-link-silent-ridgebury`.

Laws lead, Oct 25 11:40: in PR #6026 (head fee1a54619, #5582 merged in); merge after #5582.

Sent back 2026-10-25 ~23:20 UTC from PR #6026 (branch claude/laws-nine-links-health-schools, head db8866631637, main NOT merged: conflicts in code src/core2/world-poverty.ts and src/core2/law-reach/group-b-money.ts plus data gaps/coverage/unwired/stopgaps and reports): resolve on the branch preserving both sides' reach/gap rows, rerun the family gate, and it goes back in the queue; finish on that branch, merge main into it first.

Laws lead, Oct 26: PR #6026 moves to the bounded `laws-nine-links-health-schools-eight` (main merged in, conflicts resolved on the branch keeping both sides' rows). This item stays open for budget-line:healthAndHospitals, budget-line:schools and budget-line:higherEducation, which pay nothing under their own law id until the treasury change in PR #5669 lands, and for public-funds-for-private-schooling, which reached nobody in Prescott, Michigan.

Nov 11 (cause finder for Fable B): regraded on main 3039a3fa1d in Hettinger, North Dakota (seed 3f77f7d1d2688e09629641c1c0fa3cc2) with check.ts and matrix.ts, and read main's 25-place matrix. The three budget lines are wired in both. The voucher law is wired where a private school exists. Hettinger has none, so its money link falls to a stale stopgap row whose text no longer matches the code. The fix resolves that row. I propose the CTO closes the item after that.

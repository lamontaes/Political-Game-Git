---
id: laws-nine-links-housing-credit
title: "Every housing and credit law passes all nine wiring links in a played year"
area: laws
kind: wiring
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr: #6011
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

**What.** Two parts of the housing and credit family are still short of the nine wiring links: right-to-counsel-in-eviction has no hearing outside Prescott, and the cap-consumer-loan-rates money is a registered stopgap pending an owner question about small-lender loan caps. The other laws (allow-multifamily-in-single-family-zones, budget-line:housing, inclusionary-requirement, rent-stabilization) are wired; rent stabilization's money stays partly and that is right, since the 7% cap never binds in a calm year (Oct 27 rerun in Prescott, Uehling and North Pownal). A law passes the nine links when it exists in all 56 places, a body can enact and repeal it, it reaches people and organizations, the engine it changes reads it, it moves money between real accounts, it moves its outcome-web measures, people learn of it only by a read, repeal stops it, and one code path serves every place.

**Cause.** Measured: `node --import tsx scripts/law-wiring/check.ts --seed 3f77f7d1d2688e09629641c1c0fa3cc2 --only <the family's keys>` on main 3039a3fa1d (Hettinger, North Dakota, a fresh draw), graded with `scripts/law-wiring/matrix.ts`, read with main's own `docs/reports/law-wiring-matrix.json` (25 places). `cap-consumer-loan-rates` is wired on all nine links in both. Its money is a real payment, not a stopgap: on 2025-02-01 in Hettinger, household_4076cff59709cf27's $315.33 transfer in the control world became an $8.65 transfer and a $306.68 loan settlement under the cap (journal:2025-02-01:1213), and 588 households were reached. So the owner question this item waited on no longer blocks anything. `right-to-counsel-in-eviction` is wired in main's matrix: a hearing in Prescott, Michigan reached household_1093178c88d36046 and paid the provider (journal:2025-07-16:48022), and Uehling, Nebraska shows money too. In Hettinger it grades `stopgap`, because no eviction hearing fell in the 35-day window. The housing engine reads the law only at a hearing (`src/core2/modules/housing.ts`, `lawInForce(api, RIGHT_TO_COUNSEL)` near line 2337), and the grader then names the open row `SG-GOV-REACH-A-eviction-cases` (marker at housing.ts line 2346). That row's one remaining gap is that the provider paid is the outside account, not a named legal-services organization. No player sees that. The other four laws are wired, as the What says; rent stabilization's cap binds only where rents rise faster than 7 percent.

**Fix.** Nothing to build. Proposed: the CTO closes the item (`npm run pool -- status laws-nine-links-housing-credit done --by=cto`), since every law in the family is wired in main's matrix. The named legal-services provider in `SG-GOV-REACH-A-eviction-cases` is depth no player sees (owner, Nov 10). If the CTO keeps the item, the one check worth doing is the Done when below.

**Time box.** 1 hour for one Haiku session, only if the CTO keeps the item.

**Rules.** An effect is a read, not a record: the engine that pays or decides reads the law and records whom it applied it to through `lawApplied`. One model, two tiers: counted groups take the same rule as full people, times the count. Ask why: a person attributes a change to the law only after news they received, a conversation, a notice or an ad. The chain is the acceptance: each law is followed to a named person and a dollar.

**Done when.** The CTO closes the item. If it is kept, a second session runs `scripts/law-wiring/check.ts` with `--only us-policy-positions:housing-land-use.right-to-counsel-in-eviction --days 120` in a drawn place where an eviction hearing falls in the window (drawing again until one does, and naming the places passed over, as `drawn-place-tests` says), names the place and seed, and sees the counsel law's `lawApplied` row for the household, the provider payment on the journal and the repayment plan offered.

**Waits on.** Nothing. The loan cap's money is wired, so the owner question on small-lender loan caps is not needed.

**Files.** src/core2/modules/housing.ts, src/core2/modules/credit.ts, src/core2/data/stopgaps/gov.json, scripts/law-wiring/check.ts

**Notes.** Split Oct 24 by the CTO from `laws-wiring-every-law` (the lead order: `docs/work-orders/lead-laws-2026-10-24.md`). Family PR state on Oct 23: merged, #5688; its follow-up `laws-wiring-housing-followup` (no Pool item line, a typecheck clean-up) is open. A PR for this family names this item on line 1 (`Pool item: laws-nine-links-housing-credit`) and `Lead: laws` in its body, never the umbrella: family PRs looped because the umbrella's done-when is one no single family can meet, and a bare umbrella id on line 1 closes the umbrella on merge. Merged does not mean nine links: rebuild the matrix on main and finish what the rows still show missing, partial or stopgapped.

Laws lead, Oct 25 10:10: PR #6011 opened at 353dddd61e. 5 of 6 graded wired; right to counsel partly (no hearing outside Prescott); loan cap money is a registered stopgap pending the owner's small-lender question; money cells rest on untraced payments (laws-checker-pass-through-poster, laws-checker-file-reads-many-laws). Merge after #5582.

Sent back 2026-10-26 from PR #6011 (branch claude/laws-nine-links-housing-credit): Current main conflicts in outcome-research-gaps.json and generated law-wiring matrix/table; Done-when evidence explicitly remains partly met for the six-law nine-link family and not met for loan-cap money, which is a registered stopgap and cannot count as completion.; finish on that branch, merge main into it first.

Laws-and-effects lead, Oct 27 20:55: rent stabilization's money stays partly, and it is right. Rerun on main's checker for 365 days in Prescott (9 leases reached), Uehling (20) and North Pownal (14), every lease the cap governed saved 0: the 7% cap (`rentIncreaseCap`) never binds in a calm year, since market rent follows regional pay and vacancy (`src/core2/housing-occupancy.ts`). The money link shows only where rents rise faster than the cap. Do not splice such reruns into the family files: the own-payment path would grade drift of a few cents as the law's money (`laws-checker-own-payment-counts-drift`).

Nov 11 (cause finder for Fable B): regraded on main 3039a3fa1d in Hettinger, North Dakota (seed 3f77f7d1d2688e09629641c1c0fa3cc2) and read main's 25-place matrix. The loan cap is wired with a real change in a household's payments, so it no longer waits on the owner. Right to counsel is wired where a hearing happens (Prescott); Hettinger had none in 35 days. I propose the CTO closes the item.

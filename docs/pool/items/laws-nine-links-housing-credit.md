---
id: laws-nine-links-housing-credit
title: "Every housing and credit law passes all nine wiring links in a played year"
area: laws
kind: wiring
priority: 1
size: M
status: open
claimed-by:
pr: #6011
blocked-on:
source: "CTO weekend leads, Oct 24 (PR cto/leads-2026-10-24)"
claimed-at: 
---

**What.** This is one bounded family of the umbrella `laws-wiring-every-law`, which no single family PR could finish. Every law in the housing and credit family must pass all nine links of the law-wiring standard: it exists in all 56 places, a body can enact and repeal it, it reaches people and organizations, the engine it changes reads it, it moves money between real accounts, it moves its outcome-web measures, people learn of it only by a read, repeal stops it, and one code path serves every place. The laws, as the Oct 20 matrix assigns them (the lead corrects the list on its first rebuild): allow-multifamily-in-single-family-zones, budget-line:housing, inclusionary-requirement, rent-stabilization, right-to-counsel-in-eviction and cap-consumer-loan-rates.

**Rules.** An effect is a read, not a record: the engine that pays or decides reads the law and records whom it applied it to through `lawApplied`. One model, two tiers: counted groups take the same rule as full people, times the count. Ask why: a person attributes a change to the law only after news they received, a conversation, a notice or an ad. The chain is the acceptance: each law is followed to a named person and a dollar.

**Done when.** In a played year (`buildBenchWorld`, every module installed) in two places drawn from all 56 with seeds the builder did not choose, named in the PR body, `scripts/law-wiring/check.ts` and `scripts/law-wiring/matrix.ts` grade every law in this family wired on all nine links in `docs/reports/law-wiring-matrix.json`. A link declared not applicable in `scripts/law-wiring/declared.json` with its statute or research reason counts; a registered stopgap does not. The family test names, for each law, its `lawApplied` record id, the journal entry of the money and the person or household reached. **On screen.** Nothing yet: it would show on Politics → Budgets, and nothing there reads it.

**Files.** src/core2/modules/housing.ts, src/core2/housing-occupancy.ts, src/core2/modules/credit.ts, src/core2/law-reach/group-a.ts

**Notes.** Split Oct 24 by the CTO from `laws-wiring-every-law` (the lead order: `docs/work-orders/lead-laws-2026-10-24.md`). Family PR state on Oct 23: merged, #5688; its follow-up `laws-wiring-housing-followup` (no Pool item line, a typecheck clean-up) is open. A PR for this family names this item on line 1 (`Pool item: laws-nine-links-housing-credit`) and `Lead: laws` in its body, never the umbrella: family PRs looped because the umbrella's done-when is one no single family can meet, and a bare umbrella id on line 1 closes the umbrella on merge. Merged does not mean nine links: rebuild the matrix on main and finish what the rows still show missing, partial or stopgapped.

Laws lead, Oct 25 10:10: PR #6011 opened at 353dddd61e. 5 of 6 graded wired; right to counsel partly (no hearing outside Prescott); loan cap money is a registered stopgap pending the owner's small-lender question; money cells rest on untraced payments (laws-checker-pass-through-poster, laws-checker-file-reads-many-laws). Merge after #5582.

Sent back 2026-10-26 from PR #6011 (branch claude/laws-nine-links-housing-credit): Current main conflicts in outcome-research-gaps.json and generated law-wiring matrix/table; Done-when evidence explicitly remains partly met for the six-law nine-link family and not met for loan-cap money, which is a registered stopgap and cannot count as completion.; finish on that branch, merge main into it first.

Laws-and-effects lead, Oct 27 20:55: rent stabilization's money stays partly, and it is right. Rerun on main's checker for 365 days in Prescott (9 leases reached), Uehling (20) and North Pownal (14), every lease the cap governed saved 0: the 7% cap (`rentIncreaseCap`) never binds in a calm year, since market rent follows regional pay and vacancy (`src/core2/housing-occupancy.ts`). The money link shows only where rents rise faster than the cap. Do not splice such reruns into the family files: the own-payment path would grade drift of a few cents as the law's money (`laws-checker-own-payment-counts-drift`).

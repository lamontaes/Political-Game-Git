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
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
---

**What.** Two parts of the housing and credit family are still short of the nine wiring links: right-to-counsel-in-eviction has no hearing outside Prescott, and the cap-consumer-loan-rates money is a registered stopgap pending an owner question about small-lender loan caps. The other laws (allow-multifamily-in-single-family-zones, budget-line:housing, inclusionary-requirement, rent-stabilization) are wired; rent stabilization's money stays partly and that is right, since the 7% cap never binds in a calm year (Oct 27 rerun in Prescott, Uehling and North Pownal). A law passes the nine links when it exists in all 56 places, a body can enact and repeal it, it reaches people and organizations, the engine it changes reads it, it moves money between real accounts, it moves its outcome-web measures, people learn of it only by a read, repeal stops it, and one code path serves every place.

**Cause.** Needs cause. Looked at the item, its Notes and docs/reports/law-wiring-matrix.json (not regraded on main in this pass); the right-to-counsel gap is described but no code location is given, and OWNER-DECISIONS.md holds no open question on small-lender loan caps.

**Fix.** None until the cause is found.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop. The session regrades the matrix on main for the two laws and rewrites this item with Found in code or Measured and a real Fix.

**Rules.** An effect is a read, not a record: the engine that pays or decides reads the law and records whom it applied it to through `lawApplied`. One model, two tiers: counted groups take the same rule as full people, times the count. Ask why: a person attributes a change to the law only after news they received, a conversation, a notice or an ad. The chain is the acceptance: each law is followed to a named person and a dollar.

**Done when.** A second session, not the builder, replays this on main in the running game: in two drawn places on seeds nobody chose, dev mode and the law check follow each law still open in this item to a named person or household and a dollar, by `lawApplied` record id and journal entry. The builder's proof: In a played year (`buildBenchWorld`, every module installed) in two places drawn from all 56 with seeds the builder did not choose, named in the PR body, `scripts/law-wiring/check.ts` and `scripts/law-wiring/matrix.ts` grade every law in this family wired on all nine links in `docs/reports/law-wiring-matrix.json`. A link declared not applicable in `scripts/law-wiring/declared.json` with its statute or research reason counts; a registered stopgap does not. The family test names, for each law, its `lawApplied` record id, the journal entry of the money and the person or household reached. **On screen.** Nothing yet: it would show on Politics → Budgets, and nothing there reads it.

**Waits on.** The owner question on small-lender loan caps, which OWNER-DECISIONS.md does not yet hold (the CTO registers it).

**Files.** src/core2/modules/housing.ts, src/core2/housing-occupancy.ts, src/core2/modules/credit.ts, src/core2/law-reach/group-a.ts

**Notes.** Split Oct 24 by the CTO from `laws-wiring-every-law` (the lead order: `docs/work-orders/lead-laws-2026-10-24.md`). Family PR state on Oct 23: merged, #5688; its follow-up `laws-wiring-housing-followup` (no Pool item line, a typecheck clean-up) is open. A PR for this family names this item on line 1 (`Pool item: laws-nine-links-housing-credit`) and `Lead: laws` in its body, never the umbrella: family PRs looped because the umbrella's done-when is one no single family can meet, and a bare umbrella id on line 1 closes the umbrella on merge. Merged does not mean nine links: rebuild the matrix on main and finish what the rows still show missing, partial or stopgapped.

Laws lead, Oct 25 10:10: PR #6011 opened at 353dddd61e. 5 of 6 graded wired; right to counsel partly (no hearing outside Prescott); loan cap money is a registered stopgap pending the owner's small-lender question; money cells rest on untraced payments (laws-checker-pass-through-poster, laws-checker-file-reads-many-laws). Merge after #5582.

Sent back 2026-10-26 from PR #6011 (branch claude/laws-nine-links-housing-credit): Current main conflicts in outcome-research-gaps.json and generated law-wiring matrix/table; Done-when evidence explicitly remains partly met for the six-law nine-link family and not met for loan-cap money, which is a registered stopgap and cannot count as completion.; finish on that branch, merge main into it first.

Laws-and-effects lead, Oct 27 20:55: rent stabilization's money stays partly, and it is right. Rerun on main's checker for 365 days in Prescott (9 leases reached), Uehling (20) and North Pownal (14), every lease the cap governed saved 0: the 7% cap (`rentIncreaseCap`) never binds in a calm year, since market rent follows regional pay and vacancy (`src/core2/housing-occupancy.ts`). The money link shows only where rents rise faster than the cap. Do not splice such reruns into the family files: the own-payment path would grade drift of a few cents as the law's money (`laws-checker-own-payment-counts-drift`).

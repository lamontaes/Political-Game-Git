---
id: laws-nine-links-taxes
title: "Every taxes and public finance law passes all nine wiring links in a played year"
area: laws
kind: wiring
priority: 1
size: M
status: open
claimed-by:
pr: #5649
blocked-on:
source: "CTO weekend leads, Oct 24 (PR cto/leads-2026-10-24)"
---

**What.** This is one bounded family of the umbrella `laws-wiring-every-law`, which no single family PR could finish. Every law in the taxes and public finance family must pass all nine links of the law-wiring standard: it exists in all 56 places, a body can enact and repeal it, it reaches people and organizations, the engine it changes reads it, it moves money between real accounts, it moves its outcome-web measures, people learn of it only by a read, repeal stops it, and one code path serves every place. The laws, as the Oct 20 matrix assigns them (the lead corrects the list on its first rebuild): income-tax, property-tax, corporate-income-tax, estate-tax, inheritance-tax, adopt-income-tax, cap-property-tax-growth, graduated-income-tax, balanced-operating-budget, fund-pensions-to-schedule, minimum-reserve-balance and local-income-tax-authority.

**Rules.** An effect is a read, not a record: the engine that pays or decides reads the law and records whom it applied it to through `lawApplied`. One model, two tiers: counted groups take the same rule as full people, times the count. Ask why: a person attributes a change to the law only after news they received, a conversation, a notice or an ad. The chain is the acceptance: each law is followed to a named person and a dollar.

**Done when.** In a played year (`buildBenchWorld`, every module installed) in two places drawn from all 56 with seeds the builder did not choose, named in the PR body, `scripts/law-wiring/check.ts` and `scripts/law-wiring/matrix.ts` grade every law in this family wired on all nine links in `docs/reports/law-wiring-matrix.json`. A link declared not applicable in `scripts/law-wiring/declared.json` with its statute or research reason counts; a registered stopgap does not. The family test names, for each law, its `lawApplied` record id, the journal entry of the money and the person or household reached.

**Files.** src/core2/modules/employer-taxes.ts, src/core2/budgets-treasury.ts, src/core2/law-reach/applied.ts

**Notes.** Split Oct 24 by the CTO from `laws-wiring-every-law` (the lead order: `docs/work-orders/lead-laws-2026-10-24.md`). Family PR state on Oct 23: open, #5649 (branch claude/law-wiring-taxes), sent back Oct 21 for corporate-tax arrears (item `laws-corporate-tax-arrears-by-jurisdiction`); the death-tax terms fix is #5744 (item `laws-death-tax-rate-only-terms`). A PR for this family names this item on line 1 (`Pool item: laws-nine-links-taxes`) and `Lead: laws` in its body; a bare umbrella id on line 1 marks the umbrella done on merge, which is why family PRs looped. The arrears and death-tax fixes are part of this family; land them with it.

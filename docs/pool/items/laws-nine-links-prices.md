---
id: laws-nine-links-prices
title: "Every prices and sales taxes law passes all nine wiring links in a played year"
area: laws
lead: laws
kind: wiring
priority: 1
size: M
status: in-pr
claimed-by: claude/laws-nine-links-prices
pr: #5986
blocked-on:
source: "CTO weekend leads, Oct 24 (PR cto/leads-2026-10-24)"
claimed-at:
---

**What.** This is one bounded family of the umbrella `laws-wiring-every-law`, which no single family PR could finish. Every law in the prices and sales taxes family must pass all nine links of the law-wiring standard: it exists in all 56 places, a body can enact and repeal it, it reaches people and organizations, the engine it changes reads it, it moves money between real accounts, it moves its outcome-web measures, people learn of it only by a read, repeal stops it, and one code path serves every place. The laws, as the Oct 20 matrix assigns them (the lead corrects the list on its first rebuild): sales-tax, exempt-groceries-from-sales-tax, fare-free-transit, mileage-fee-replaces-fuel-tax, public-broadband, clean-electricity-standard, bottle-deposit, price-carbon, ban-new-gas-hookups and legalize-cannabis-sales.

**Rules.** An effect is a read, not a record: the engine that pays or decides reads the law and records whom it applied it to through `lawApplied`. One model, two tiers: counted groups take the same rule as full people, times the count. Ask why: a person attributes a change to the law only after news they received, a conversation, a notice or an ad. The chain is the acceptance: each law is followed to a named person and a dollar.

**Done when.** In a played year (`buildBenchWorld`, every module installed) in two places drawn from all 56 with seeds the builder did not choose, named in the PR body, `scripts/law-wiring/check.ts` and `scripts/law-wiring/matrix.ts` grade every law in this family wired on all nine links in `docs/reports/law-wiring-matrix.json`. A link declared not applicable in `scripts/law-wiring/declared.json` with its statute or research reason counts; a registered stopgap does not. The family test names, for each law, its `lawApplied` record id, the journal entry of the money and the person or household reached. **On screen.** Nothing yet: it would show on Politics → Campaigns and the election night results, and nothing there reads it.

**Files.** src/core2/modules/place-prices.ts, src/core2/law-reach/group-b.ts, src/core2/law-reach/applied.ts

**Notes.** Split Oct 24 by the CTO from `laws-wiring-every-law` (the lead order: `docs/work-orders/lead-laws-2026-10-24.md`). Family PR state on Oct 23: merged, #5629. A PR for this family names this item on line 1 (`Pool item: laws-nine-links-prices`) and `Lead: laws` in its body, never the umbrella: family PRs looped because the umbrella's done-when is one no single family can meet, and a bare umbrella id on line 1 closes the umbrella on merge. Merged does not mean nine links: rebuild the matrix on main and finish what the rows still show missing, partial or stopgapped.

Laws lead, Oct 25 06:15: in PR #5986 (merge after #5582). Nine of ten laws wired; the per-mile fee's outcome link waits on web-vehicle-miles-traveled-per-resident (CTO decision in the PR).

Sent back 2026-10-25 19:04 UTC from PR #5986 (branch claude/laws-nine-links-prices): first Done-when row requires every family law on all nine links but body/table admit mileage-fee-replaces-fuel-tax outcome remains SG-LAW-outcome-link-unresearched; complete its researched link/year proof or route a completed bounded slice to its own item while this family stays open; finish on that branch, merge main into it first.

Laws lead, Oct 25 23:30: #5986 is back in review. All ten prices laws grade wired on the own-payment checker in both audit towns (the grocery exemption in Colome, South Dakota; the gas hookup ban over 900 days, since no builder starts a house in either town within a year), with the mileage link from web-vehicle-miles-traveled-per-resident folded in.

Merger 2: Sent back 2026-10-26 from PR #5986 (branch claude/laws-nine-links-prices), checked561a26a69c783c0f961899910a4639d8cb4d7851: mileage gap is corrected, but the first Done-when row still counts false-early outcome grades. Committed prices-year-US-MI-2666300.json5065/6062 counts January2025 electricity -0.11 with84-month lag and litter +0.45 with12-month lag, both from the opening-month repeal. Integrate corrected lag behavior (#6006/web-lag-law-before-opening-reads-none) and regenerate controlled reports/matrix, using supported long-lag grading for genuine beyond-run effects; do not count January false positives. Or route a completed bounded subset while this all-ten family stays OPEN. No local green gate claimed; retain mileage research/read/tests and secondary VMT work, finish on that branch with main merged first. Exact return: https://github.com/lamontaes/Political-Game-Git/pull/5986#issuecomment-6406374938.

Laws lead, Oct 26: PR #5986 moves to the bounded `laws-nine-links-prices-eight`. This item stays open for the clean electricity standard and the bottle deposit, whose outcome effects show before their lag until `web-lag-law-before-opening-reads-none` (PR #6006) is on main; then they are rerun.

Laws lead, Oct 26: PR #5986 now lands all ten laws and moves back to this item. #6006's lag fix is ported unchanged, so a repealed starting law waits its research lag; cannabis, the bottle deposit and the clean electricity standard were rerun in both audit towns and every outcome link fires at its lag or falls to the long-lag rule.

---
id: laws-nine-links-taxes-eleven
title: "Eleven of the twelve taxes laws pass all nine wiring links in a played year (the estate tax waits on estates that owe it)"
area: laws
lead: laws
kind: wiring
priority: 1
size: S
status: in-pr
claimed-by: claude/law-wiring-taxes
pr: "#5649"
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** A bounded part of `laws-nine-links-taxes`, as the mergers asked for when a family lands a completed subset first. Eleven of the family's twelve laws grade wired on all nine links, or not applicable, on the law checker that credits a law only with its own payment: income-tax, property-tax, corporate-income-tax, inheritance-tax, adopt-income-tax, cap-property-tax-growth, graduated-income-tax, balanced-operating-budget, fund-pensions-to-schedule, minimum-reserve-balance and local-income-tax-authority. The twelfth, estate-tax, cannot move money in any played world yet: no resident's estate is large enough to owe it (`people-estate-wealth-top-tail`). The family item stays open for it.

**Rules.** An effect is a read, not a record. The chain is the acceptance: each law is followed to a named payer, payee and journal id with its control-world amount. A registered stopgap never counts.

**Done when.** In a played year (`buildBenchWorld`, every module installed) in the two audit places (Prescott, Michigan seed a91c03e7d2b84f10 and Uehling, Nebraska seed 5e27b0c4196fd3a8), with third places drawn where a law stands at the opening, `scripts/law-wiring/check.ts` and `scripts/law-wiring/matrix.ts` grade each of the eleven laws above wired on all nine links or declared not applicable in `docs/reports/law-wiring-matrix.json`, and the family test names, for each of them, its `lawApplied` record id, the journal entry of its money and the person, household or organization reached.

**Files.** scripts/law-wiring/check.ts, scripts/law-wiring/matrix.ts, src/core2/law-wiring-taxes.test.ts

**Notes.** Laws lead, Oct 25. PR #5649 moves to this item; `laws-nine-links-taxes` stays open for the estate tax, blocked on `people-estate-wealth-top-tail`.

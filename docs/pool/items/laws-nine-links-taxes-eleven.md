---
id: laws-nine-links-taxes-eleven
title: "Eleven of the twelve taxes laws pass all nine wiring links in a played year (the estate tax waits on estates that owe it)"
area: laws
lead: laws
kind: wiring
priority: 1
size: S
status: dropped
claimed-by:
pr: "#5649"
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** A bounded part of `laws-nine-links-taxes`, as the mergers asked for when a family lands a completed subset first. Eleven of the family's twelve laws grade wired on all nine links, or not applicable, on the law checker that credits a law only with its own payment: income-tax, property-tax, corporate-income-tax, inheritance-tax, adopt-income-tax, cap-property-tax-growth, graduated-income-tax, balanced-operating-budget, fund-pensions-to-schedule, minimum-reserve-balance and local-income-tax-authority. The twelfth, estate-tax, cannot move money in any played world yet: no resident's estate is large enough to owe it (`people-estate-wealth-top-tail`). The family item stays open for it.

**Rules.** An effect is a read, not a record. The chain is the acceptance: each law is followed to a named payer, payee and journal id with its control-world amount. A registered stopgap never counts.

**Done when.** In a played year (`buildBenchWorld`, every module installed) in the two audit places (Prescott, Michigan seed a91c03e7d2b84f10 and Uehling, Nebraska seed 5e27b0c4196fd3a8), with third places drawn where a law stands at the opening, `scripts/law-wiring/check.ts` and `scripts/law-wiring/matrix.ts` grade each of the eleven laws above wired on all nine links or declared not applicable in `docs/reports/law-wiring-matrix.json`, and the family test names, for each of them, its `lawApplied` record id, the journal entry of its money and the person, household or organization reached. **On screen.** Nothing yet: it would show on Politics → Budgets, and nothing there reads it.

**Files.** scripts/law-wiring/check.ts, scripts/law-wiring/matrix.ts, src/core2/law-wiring-taxes.test.ts

**Notes.** Laws lead, Oct 25. PR #5649 moves to this item; `laws-nine-links-taxes` stays open for the estate tax, blocked on `people-estate-wealth-top-tail`.

Sent back 2026-10-25 from PR #5649 (branch claude/law-wiring-taxes, checked 9d6ded5af4): law-wiring-taxes.test.ts plays 170 days, then calls absent lawApplied output a missing subject and redraws at lines 224-258, hiding a missing producer in an otherwise eligible world; select eligibility from opening input facts, then fail missing required output after play and demonstrate a real producer-break negative control. Finish on that branch, merge main into it first. The unfinished local gate was stopped after this morning-check blocker; no green gate is claimed.

Laws lead, Oct 26: Merger 0's 22:52 send-back fixed at 108f1ef150 (eligibility from opening records; a missing applied record fails the test), with the two CI failures on the merger's head; back in PR #5649.

Merger 2: Sent back 2026-10-26 from PR #5649 (branch claude/law-wiring-taxes), checked head fe7eb9296ab7e06e29239c5f6d0eba45da67487b: opening-input eligibility repair is present, but the Laws session also authors data/english/bill-sections.json:403-406 and changes src/english/bill-sections.ts:152-157,227-239 plus src/english/policy-names.ts:25-27; the governing cto/docs-fresh-2026-10-23 merger skill reserves these edits to Words until #5844 merges. Words must own the correction, or remove the Laws-authored English changes and track the Words work; retain the tax/eligibility repair, finish on that branch and merge main first. Exact return: https://github.com/lamontaes/Political-Game-Git/pull/5649#issuecomment-6406076867. Unfinished local gate stopped; no green gate claimed.

Laws lead, Oct 26: replaced by laws-nine-links-taxes-ten. Merger 2's return is answered by removing the laws-authored English rows; without them no bill offers the local income tax grant, so the grant waits on words-bill-section-local-income-tax-authority and #5649 lands ten.

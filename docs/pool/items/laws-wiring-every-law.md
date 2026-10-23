---
id: laws-wiring-every-law
title: "Every law wired on all nine links, with a checker and matrix"
area: laws
kind: wiring
priority: 1
size: L
status: open
claimed-by:
pr: #5547
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** Laws take effect and most reach nobody, move no money and move no outcome measure. Build a checker that changes every law in drawn places and grades nine links, publish the matrix, then wire every family of laws on its own pull request. Each family's engine records whom it applied a law to through lawApplied.

**Rules.** An effect is a read: the engine that pays or decides reads the law and records whom it applied it to. One model, two tiers: counted groups take the same rule as full people. Wire to the world: every law moves money or people in a played world.

**Done when.** In two places drawn from all 56, the checker scripts/law-wiring/check.ts on buildBenchWorld shows every law wired on all nine links or carrying a specific stopgap row, docs/reports/law-wiring-matrix.json shows it, and each family test names record ids.

**Files.** scripts/law-wiring/check.ts, src/core2/law-reach/applied.ts, src/core2/law-reach/host.ts, docs/reports/law-wiring-2026-10-20.md

**Notes.** TODO

Sent back 2026-10-21 from PR #5669 (branch claude/law-wiring-rights-env): src/core2/data/laws/reach-group-a.json removes three reach rows: discrimination/employers, age-verification/platforms and data-privacy/businesses (around lines 554, 640 and 687), plus the online selector. The PR description says four records-only reach rows were removed. Correct that count and its removal list to match the final diff; the morning check requires checking these claims rather than accepting them. Main merged cleanly and was plain-pushed here. Comparing stopgap IDs confirms no row was lost; no local gate pass is claimed.; finish on that branch, merge main into it first.

Sent back 2026-10-21 from PR #5649 (branch claude/law-wiring-taxes): src/core2/modules/employer-taxes.ts:228-247 combines corporate-tax arrears into one amount and distributes payments using current-quarter taxes, with tax || 1 for zero-tax quarters. This loses which treasury owns the debt: federal/state arrears of 100/50 paid in a quarter with zero profit become 75/75 instead of 100/50. The comment claiming federal arrears are paid first is also not what the code does. Keep arrears and settlement ownership per jurisdiction, including when current profit is zero or a rate changes/repeals, and add a nonempty arrears regression beside the drawn-place family proof. Main merged here; the stopgap conflict was resolved by row/field with all 457 IDs preserved and plain-pushed. No local gate pass is claimed.; finish on that branch, merge main into it first.

Sent back 2026-10-22 from PR #5669 (branch claude/law-wiring-rights-env): Fresh normal main integration conflicts in src/core2/modules/business.ts:43; preserve both current readers and the family wiring, and correct the three-row removal count.; finish on that branch, merge main into it first.

Sent back 2026-10-23 from PR #5582 (branch claude/law-wiring-government): Election-cost repayment at group-a-voting.ts:340-349 stops after repeal even when owedMinor remains positive; preserve and settle incurred debt and add a nonempty repeal regression; finish on that branch, merge main into it first.

Sent back 2026-10-23 from PR #5589 (branch claude/law-wiring-labor): Missing Done when evidence table for the drawn-place, nine-link checker/matrix and family record-ID acceptance; add verifiable evidence and bound the family scope; finish on that branch, merge main into it first.

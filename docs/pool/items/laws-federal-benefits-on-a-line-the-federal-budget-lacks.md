---
id: laws-federal-benefits-on-a-line-the-federal-budget-lacks
title: "The federal treasury's SNAP benefits count against a welfare and Medicaid line the federal budget lacks, so the close pays them on top of the budget"
area: laws
lead: laws-effects
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: laws lead helper, Oct 30 (claude/laws-medical-debt, the medical debt test's treasury check)
---

**What.** The law reach's line payer (`registerLinePayments` in `src/core2/law-reach/group-b-money.ts`, near line 349) counts every benefit, voucher and preschool obligation against `row.line ?? "welfareAndMedicaid"` for the government that pays it. The SNAP benefit (`src/core2/law-reach/group-b-food-aid.ts`, `reconcileObligations` with no `line`) is paid by the federal treasury, and the federal budget has no welfare and Medicaid line: its lines are the Treasury's outlays by function (`data/research/money/federal-budget-fy2025.json`: incomeSecurity, health, medicare and the rest). The close (`closeTreasuries` in `src/core2/budgets-treasury.ts`) builds what each line is due from the budget's own lines, so the federal month keeps the benefits as a welfare and Medicaid row with nothing due and pays incomeSecurity's full twelfth beside them: the town's SNAP is paid on top of the federal budget. Seen in Patterson, Louisiana (2259340, world seed ccbbc26ceb2360d84806cb74d23ccff05afcfa99e1203f69c1210c5bcc7037e2, MEDICAL_DEBT_SEED=wf-med-1): `treasury-month:US:2025-02-01` has `welfareAndMedicaid` with dueMinor 0 and inTownMinor 18789100. The Medicaid care had the same defect and was fixed on claude/laws-medical-debt (the federal leg now counts against the federal health line, `FEDERAL_MEDICAID_LINE`).

**Rules.** One engine: the line a payment counts against is the paying government's own budget line, read from its budget, never a level named in code beyond the line key the reach already keeps. Replace, never layer: the default line goes, not a second mapping beside it. An effect is a read: the federal close reads the benefits inside incomeSecurity.

**Done when.** In a drawn place built with buildBenchWorld, played one year, no federal treasury month carries a line its budget lacks, and the federal incomeSecurity line's in-town amount holds the SNAP benefits paid in town that month, named by treasury-month id and journal id; the SNAP maximum and the assistance work requirement keep their grades on the law-wiring checker.

**Time box.** 2 hours, the laws lead or a Sonnet helper.

**Files.** src/core2/law-reach/group-b-money.ts, src/core2/law-reach/group-b-food-aid.ts, src/core2/budgets-treasury.ts

**Notes.** Filed by the laws lead helper, Oct 30, from the medical debt test on wf-med-1, whose check that no federal month carries the welfare and Medicaid line caught the SNAP benefits rather than the Medicaid care; that test now checks the care's own notes since each close.

---
id: laws-federal-benefits-on-a-line-the-federal-budget-lacks
title: "The federal treasury's SNAP benefits count against a welfare and Medicaid line the federal budget lacks, so the close pays them on top of the budget"
area: laws
lead: laws-effects
kind: bug
priority: 2
size: S
status: merged
standard: 2
claimed-by: claude/pool-laws-federal-benefits-on-a-line-the-federal-budget-lacks
pr: #8467
after:
blocked-on:
model: sonnet
effort: low
root: rc8-law-judged-by-paperwork
source: laws lead helper, Oct 30 (claude/laws-medical-debt, the medical debt test's treasury check)
checked: fable 2026-11-10
claimed-at: 2026-11-11T02:20:59.246Z
merged-at: 2026-11-12T18:01:40.810Z
---

**What.** The law reach's line payer counts every benefit, voucher and preschool obligation against `row.line ?? "welfareAndMedicaid"` for the government that pays it. The SNAP benefit is paid by the federal treasury, and the federal budget has no welfare and Medicaid line: its lines are the Treasury's outlays by function (incomeSecurity, health, medicare and the rest). The close builds what each line is due from the budget's own lines, so the federal month keeps the benefits as a welfare and Medicaid row with nothing due and pays incomeSecurity's full twelfth beside them, and the town's SNAP is paid on top of the federal budget. Seen in Patterson, Louisiana (2259340, world seed ccbbc26ceb2360d84806cb74d23ccff05afcfa99e1203f69c1210c5bcc7037e2, MEDICAL_DEBT_SEED=wf-med-1): `treasury-month:US:2025-02-01` has `welfareAndMedicaid` with dueMinor 0 and inTownMinor 18789100. The Medicaid care had the same defect and was fixed on claude/laws-medical-debt (the federal leg counts against the federal health line, `FEDERAL_MEDICAID_LINE`). Seen: the federal close paying benefits on top of the budget, a wrong dollar on the federal budget screen.

**Cause.** Found in code: src/core2/law-reach/group-b-money.ts (line 351, `const line = row.line ?? "welfareAndMedicaid"` in the line payer) counts SNAP, which `reconcileObligations` in src/core2/law-reach/group-b-food-aid.ts creates with no `line`, against a line the federal budget lacks (data/research/money/federal-budget-fy2025.json); `closeTreasuries` in src/core2/budgets-treasury.ts builds what each line is due from the budget's own lines.

**Fix.** Count each payment against the paying government's own budget line, read from its budget, and remove the default line.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One engine: the line a payment counts against is the paying government's own budget line, read from its budget, never a level named in code beyond the line key the reach already keeps. Replace, never layer: the default line goes, not a second mapping beside it. An effect is a read: the federal close reads the benefits inside incomeSecurity.

**Done when.** A second session, not the builder, plays a year in a drawn place built with `buildBenchWorld` (Patterson, Louisiana at MEDICAL_DEBT_SEED=wf-med-1 is the repro). No federal treasury month carries a line its budget lacks, and the federal incomeSecurity line's in-town amount holds the SNAP benefits paid in town that month, named by treasury-month id and journal id; the SNAP maximum and the assistance work requirement keep their grades on the law-wiring checker.

**Waits on.** Nothing.

**Files.** src/core2/law-reach/group-b-money.ts, src/core2/law-reach/group-b-food-aid.ts, src/core2/budgets-treasury.ts, data/research/money/federal-budget-fy2025.json

**Notes.** Filed by the laws lead helper, Oct 30, from the medical debt test on wf-med-1, whose check that no federal month carries the welfare and Medicaid line caught the SNAP benefits rather than the Medicaid care; that test now checks the care's own notes since each close.

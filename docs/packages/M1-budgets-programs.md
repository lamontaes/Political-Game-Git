# M1-budgets-programs: federal and state money reaching people and towns

**Contract:** the people half of M1-07 in `docs/roadmap/features.json`. In a random place over a year, federal and state money reaches named residents and the town: Social Security, Medicare, Medicaid, food assistance, unemployment insurance, and school and road grants; every dollar balances. M1-07 passes when this and M1-budgets-taxes have both passed.

**Builder:** a new Codex session, CODEX-PROGRAMS, at **medium**: the benefit formulas are already lifted, and payments flow through the accounts M1-budgets-taxes builds.
**Finisher:** a new Claude session, **Opus at high** (owner, Oct 10: M1-07).
**Branch:** `pool/M1-programs`, stacked on `pool/M1-budgets`, with `pool/M1-jobs` merged in locally for unemployment. **Starts:** when M1-budgets-taxes' treasuries and withholding are on its branch.
**Owns:** `src/core2/modules/programs.ts`, `src/core2/program-*.ts`, `src/core2/data/programs/`, `data/research/programs/`, and their tests. Read `M1-common.md` first.

## What exists

- **Old core:** benefits barely reach people. `src/simulation/public-benefit-formulas.ts` has Social Security and SNAP formulas that only tests call; Medicaid is an eligibility record (`src/simulation/crisis/health-coverage.ts`); SNAP is a participation record; unemployment is a flat 26 weeks in `src/simulation/living-world/town-finances.ts` (line 240). Federal money reaches states as revenue totals (`federal-state-program-payments.ts`, `federal-outlay-laws.ts`).
- **Lifted rules** (outcome-web shelf, PR #3933): `primaryInsuranceAmountMinor`, `retiredWorkerBenefitMinor`, `applyCostOfLivingRaiseMinor`, `foodAidBenefitMinor`, `povertyLineMinor`.
- **New core:** retirement income is an opening outside cash flow (`data/research/retirement-opening-2021.json`), not a benefit someone qualifies for.
- **Data:** `data/research/money/public-programs-2026.json` (56 places; mostly short-snippet grade; 49 of 56 Medicaid match rates missing, which M1-laws' research fills), `snap-average-monthly-benefit-by-state-fy2023.json` (53 places).

## Research first

1. **Unemployment insurance** by state: who qualifies, weekly benefit formula, minimum and maximum, waiting week, duration (U.S. Department of Labor's comparison of state laws). All 56 where a program exists.
2. **Medicaid and CHIP** eligibility by state and group (CMS and each state's Medicaid agency), and the federal match (from M1-laws).
3. **SNAP** eligibility and benefits by household size (USDA), with territory programs (Puerto Rico's nutrition block grant, American Samoa and the Northern Marianas).
4. **Social Security and Medicare:** retirement, disability and survivor benefits from earnings history (SSA), Medicare enrollment at 65 and its premiums (CMS).
5. **School and road grants:** Title I and special education allocations to districts (U.S. Department of Education), state school aid formulas for a representative sample of states, and federal highway apportionments to states and their pass-through to local roads (FHWA).

## Build

1. **Programs as records:** each program (level, rules, amount formula, payer account) in the module's tables, read from law in force so a law change later changes the program.
2. **Applying is a choice.** A person who might qualify gets an offer to apply, scored from need, knowing the program exists (who they know, past contact) and traits such as pride; not everyone eligible applies, which matches real take-up rates as a check, never as a draw. The agency decides from the rules and the person's records.
3. **Benefits pay on their real schedule** from the federal or state account through `postJournal`: Social Security monthly on its schedule, unemployment weekly while the person qualifies and searches (from M1-jobs' unemployment state), SNAP monthly. Benefit amounts come from the person's own earnings history and household, through the lifted formulas.
4. **Medicare and Medicaid** pay providers on the person's behalf when the person uses care; record the coverage and the payments, and leave the full health system for later.
5. **Grants to the town:** school and road money moves from federal to state to the school district and road department on its real schedule, as dated calendar work, into the accounts M1-budgets-taxes opened.
6. **Retirement income** moves from an opening cash flow to Social Security and pensions the person actually earned (deep past supplies earnings history), as a shared core change for SOL-1258's review.
7. **Bench:** a person's benefits, with the rule and the amount's working; the town's grants by source.

## Out of scope

Taxes and budgets (M1-budgets-taxes), new programs passed by law (M3), and the health care system beyond recording coverage and payments.

## Hand-off

The finisher runs a year in a random place: one named retiree's Social Security amount checked against the formula and their earnings history; one named laid-off worker's unemployment checked against the state's rules; one SNAP household checked against USDA tables; the town's school district receiving its grants on schedule; and every program account balanced to the cent.

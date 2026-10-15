MERGED: This follow-up has not merged. The earlier loan bookkeeping and price provenance repairs are on main.

Before: Supplied student financing used a caller's annual limit without reading the student's age, marriage or completed program periods.

After: The bounded adapter reads those saved facts and constrains supplied financing with representative published annual and aggregate-principal limits. It reuses the existing tuition charge, school payment and loan writers. It creates no automatic aid award or repayment contract.

## 1. Why-chain

New debt exists only when a saved unpaid tuition charge exceeds actual tracked cash. The surviving writer transfers actual existing federal lender cash to the borrower. It needs a maximum because the federal program limits borrowing. The annual maximum depends on recorded dependency and program year. The aggregate maximum counts outstanding principal, not interest or fees. Bedrock is the approved legal-rule model plus actual saved money and education records. No new person decision or drawn balance is claimed.

## 2. Research

CTO CHECK-IN 12 approved the Team9 FSA Handbook 2024-2025 representative packet. Annual dependent limits are $5,500, $6,500 and $7,500 for years one, two and three or later. Independent limits are $9,500, $10,500 and $12,500. Aggregate principal limits are $31,000 and $57,500. Source: https://fsapartners.ed.gov/knowledge-center/fsa-handbook/2024-2025/vol8/ch4-annual-and-aggregate-loan-limits . These are historical representative maxima, not awards or a claim of exact 2026 values. The approved 639-basis-point rate remains a separate supplied contract input; this patch does not choose or reprice rates.

## 3. Revisions

CHECK-IN 13 directs independence at recorded age 24 or older, or recorded marriage, dependents or veteran status; otherwise dependent. Age and active legal marriage have canonical saved readers. Financial-dependent and veteran bindings remain unsupported and are requested from Audit. Caregiving and occupation text do not become those facts. The dependent default is explicitly directed by the CTO, not a claim that absence was verified. Supported undergraduate bachelor's and associate paths use the existing progress summary. Graduate, subsidized, prorated and final-law forgiveness coverage remain gaps. The financial-year window and repayment/grace/default inputs remain supplied; no calendar or award producer is fabricated.

## 4. What gets built

1. Read age, dated active legal marriage and actual completed study progress.
2. Apply sourced annual ceilings and sum actual recorded principal components for the aggregate ceiling.
3. Keep the surviving financeRecordedStudentTuition writer; add current-year originations before it subtracts them, so aggregate remaining is not counted twice.
4. Keep the existing completeStudyPeriod financing callsite and its single saved school charge.
5. Extract the unchanged input validation for both entry points. No shared schema, clock, lender, cash or law-registry writer is added.

## 5. Simulated, records, world pieces, checks

Code-derived: student-aid-facts.ts:34 returns source person/enrollment/marriage/progress IDs and explicit unsupported criteria. At :127 the aggregate reader refuses an unknown legacy repayment split. At :154 it constrains the surviving shortfall writer, which still refuses paid charges and unavailable lender cash. Source provenance retains the supplied contract source and adds the actual criterion/program evidence. Ordinary due callers still supply no financing; there is no automatic loan or award. Existing school payment, repayment allocation, noncash discharge and total-debt readers remain the survivors.

## 6. Proof

Measured native proof on source576512f682f2f2145fc3525b5130f43b0c03d10a, incorporating main d1f655df2483b1d499f950dc6fdd0656338442bb: 25/25 across student-debt.test.ts and education-study-progression.test.ts, 43.80 seconds. The original five named bookkeeping, actual school-payment, repayment allocation, old-save and repeat/SaveContinue cases remain. Added cases cover age23/24, saved marriage and ending, two actual paid periods yielding year2, and aggregate principal while real accrued interest remains separate. Assertions and timeouts remain unchanged. Five selected places are not 56 newly observed schools.

Strict two-root TypeScript returned zero diagnostics. Changed-file lint, formatting, release and diff checks passed. Zero-dice returned zero new findings and five inherited removals, exit1. The first added aggregate test failed in14.86 seconds because my fixture jumped a year and skipped an existing due item. The repaired fixture uses an actual serviced monthly date and explicitly supplied financial-year boundary; isolated1/1 passed12.43 seconds, then the full final25/25 passed. No future jobs were canceled, excluded or weakened. The earlier24/24 in41.76 seconds is retained separately. Broad suites, browser, game-year speed and nationwide law audit were not run.

## 7. Worked example

Measured: Xavier Fernandez at recorded age 23 borrowed $5,500; Emerson Richardson at age 24 borrowed $9,500. Their actual saved cash and tuition shortfalls exceeded those caps; the canonical lender lost exactly the funded amount. Aaron Fuller advanced to year 2 after two actual school payments through the existing writer. Cedric Garner's controlled prior debt contract had $57,000 in principal plus real accrued interest after a recorded repayment. The explicit new financial-year fixture permitted only $500 in additional financing, bringing recorded principal to $57,500 without subtracting interest from the principal ceiling. That old contract is controlled fixture input, not a balance inferred from enrollment or a simulated yearly outcome.

# Crisis funding records spending authority, then waits for an actual payment

Before: Reported state crisis-response appropriations had no standing-authority
adapter. Federal award ceilings and totals combining funding sources could be
mistaken for a government's own adopted amount.

After: Budget opening records only a reported state's adopted amount within
its actual availability period. The government's common account remains the
cash source. A commitment and payment still need the existing office and cash
checks. This delivers authority and payment limits; service delivery remains
dependent on its actual operator and recipient records.

## 1. Why-chain

Why can a government commit this amount? The state's quoted appropriation
grants that amount of spending authority for the stated fiscal period. Why
does that not pay an operator? Authority is a legal spending limit, not a
cash receipt. Why must the payment read the account? Only an actual recorded
balance can fund a transfer. Why must an office decide first? The existing
program writer requires the recorded office holder's commitment. Why does
payment not establish care delivered? Neither a transfer nor a commitment
records a patient attending a service. Bedrock: the adopted appropriation,
the actual office decision, the cash transfer and a separately saved service.

## 2. Research

Team5's corrected data source is the Vibrant Emotional Health report on
state appropriations for the 988 Suicide & Crisis Lifeline, based on the
2025 legislative session. Its typed state amounts are USD cents for the
specified fiscal year or biennium, with the quoted source line and each
place's NASBO fiscal calendar. New Hampshire reports $6.12 million for
FY26-27, available July 1, 2025 through June 30, 2027. This is the whole
period's authority, not a yearly or monthly recurring grant.

The 2022 SAMHSA NOFO's $105 million total is maximum eligibility in an
expired two-year window. It is not awarded or received cash. All-source
totals likewise combine sources and are calibration only. The adapter reads
neither field. There are 30 adopted rows in 29 states, 15 places with no
specified state amount and 12 unreported places. No missing amount becomes
zero or a guessed appropriation.

## 3. Revisions

The source distinguishes adopted state amounts, all-source totals and
federal ceilings. Each availability window is read exactly. Expired or
future amounts create no opening authority. No population scaling,
annualization, forecast grant, renewed window or sampled amount is used.
Source jurisdiction determines the government account; no local-to-state
alias is added. The amount remains that appropriation's commitment ceiling.

## 4. What gets built

1. Read active adopted state amounts for represented governments.
2. Reuse the canonical government account and recordProgramAppropriation.
3. Save amount, exact dates, quoted basis and stable source edition once.
4. Call the adapter from the existing budget opening, after its version guard.
5. Prove authority, cash and services remain separate through saved records.

## 5. Simulated, records, world pieces, checks

Simulated: no new patient, operator, agency hire, grant receipt or decision.
The payment test explicitly authors a $1 office commitment and $1 cash
receipt through existing writers; it does not model a service price or claim
natural motives. Records: a sourced appropriation with the common public
account and actual availability dates. World pieces: the current government,
office holder, payee and cash are still required for a payment. No sitting
office holder means unavailable authority to decide. No cash means a failed
installment. An absent state, unspecified appropriation or unreported state
adds no authority. Checks: exact source amounts and dates, no cash creation,
commitment limits, lapsed-period refusal, saved payment-to-budget join and
canonical Save/Continue with repeat refusal.

## 6. Proof run

Current-main composition 134fc70afe3bf954bccd32b628a3c11d9ccc25a7 includes
main 1184ebd61d2811d21ad594ebe100d738a7581d38 and Team5 data
d598725cf543400945a2c82a10df42985afe105d. The changed test file passed
4/4. On January 5, 2026, 28 authority records correspond to the active
source windows across all 56 places. Each amount/date/quote is checked;
accounts gain no grant receipt, commitment or service from initialization.
The budget-opening caller, canonical reload and repeat also pass.

Three scoped strict TypeScript roots load 737 files with zero owned
diagnostics. Scoped lint, formatting and whitespace pass. Zero-dice exits 1
with zero new findings and five inherited stale entries. Spelling exits 1
with 19 inherited findings outside this patch. Shared baselines are untouched.

The first candidate passed two cases and failed two authored test inputs:
an empty-jurisdiction world and a Nevada case with no reported state amount.
The fixtures now use a canonical national jurisdiction for absence and a
seed-selected actual funded state. One branded currency diagnostic was
corrected. Assertions and stock timeouts remain unchanged.

The final output-only source d361eeace3e4c944a245d041f21933824ce5ef35
adds the saved holder's name and full payment lineage. The named payment
case passed 1/1 with three cases unselected, using the unchanged assertions.
Browser, game-year, nationwide natural legislative behavior, new patient
care and full-suite checks are NOT RUN. This is a dependent source delivery;
neither data nor adapter is claimed merged.

## 7. Worked example

The seeded controlled payment case selects New Hampshire and saved Governor
River Gomez, person_ab426fe3c2e083e9. The saved state
appropriation is $6.12 million for the two-year window. An explicit $1
operating commitment fails to pay while its government account has no cash.
A separately recorded $1 receipt funds a separate explicit $1 commitment.
Its installment and completed transfer appear as $1 in that government's
health-and-hospitals budget line; the actual remaining balance is $0.
The saved authority ID is public-program-record_f23f0d3c7cf23b35; the
installment is public-program-record_ef0fa6f63ee8c0eb and the transfer is
resource-transfer-outcome_f3f0b5b8fa0ddc52. The actual paid commitment is
public-program-record_33be3bae786efaa9 and its flow is
resource-flow_7e60e527fe106ee3. Replay after canonical reload
creates no additional payment. No crisis visit is inferred from it.

## Remaining dependency

The existing service-law reader requires an enacted source measure. This
sourced standing appropriation has sourceMeasureId null because the report
provides no canonical game measure. Audit and the service owner must admit
the actual standing-authority binding before connecting patient service.
No synthetic measure, policy question or second service handler is created.
The broader audit actions A16, A17, A30 and A51 remain incomplete.

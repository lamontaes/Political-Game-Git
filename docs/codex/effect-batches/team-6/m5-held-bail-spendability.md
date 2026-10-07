# Refundable bail cannot fund government spending

Before: A refundable bail deposit increased the government's recorded cash
and could appear as operating revenue. Its refund could appear as spending.
The budget did not distinguish custody money from spendable money.

After: The existing account snapshot reads Team 9's saved deposit/refund
accessor. The existing common settlement writer subtracts held bail before
allocating balance and reserve. Physical cash and exact payment IDs remain
recorded. This implements the CTO's approved custody accounting rule.

## 1. Why-chain

Held bail cannot fund government spending because it belongs to a refundable
custody obligation. That obligation exists because an actual saved deposit
was paid to the government running the court. The amount remains held until
an actual refund returns it. A refund reduces both physical cash and the
obligation, without changing operating revenue or spending. Bedrock: the
saved deposit and refund transfers. Forfeiture needs its own saved event;
failure to appear is not silently inferred as revenue.

## 2. Research

No new bail rate, premium, fee, deposit fraction or timing is introduced.
The CTO's check-in 14 approves physical cash minus held cash bail. The exact
Team 9 source is e6fa619ac5274619ab0ea88e38cb117a681a7a13. Its accessor sums
completed refundable deposits less completed refunds to the original payer.
The controlled accounting fixture uses $100.00, expressly not a researched
bail schedule. Actual production bail amounts remain Team 9's responsibility.

## 3. Revisions

The existing cash snapshot gains an optional held liability. The common
writer derives spendable cash once, before its existing reserve allocation.
The federal branch uses that same derived value and retains its null reserve.
Custody transfers keep their saved flow and outcome IDs but bypass operating
category totals. Saved settlement evidence records physical cash and held
liability. Existing account migration continues recording physical cash.
Old saved rows may omit the new evidence fields; they are not rewritten.

## 4. What gets built

1. Consume the exact approved Team 9 accessor in the existing month reader.
2. Exclude custody deposits and refunds from operating totals while retaining
   their saved payment identities.
3. Subtract held cash before common balance and reserve allocation.
4. Save physical and held amounts alongside existing settlement evidence.
5. Prove deposits, refunds, canonical Save/Continue, repeat behavior, forecast
   rejection and ordinary account behavior in five sampled places.

## 5. Simulated, records, world pieces, checks

Simulated: this change adds no court decision or person action. Team 9 owns
the actual deposit and case-close refund producers.
Records: the saved transfers determine custody liability and physical cash.
The budget records spendable balance and its existing government reserve.
World pieces: the saved court, payer, public account and actual resource
position must exist. Missing accounts remain unsupported.
Checks: physical cash equals spendable balance plus government reserve plus
held liability. Federal reserve is null. Custody payments cannot create an
operating receipt, operating expense or forecast-based settlement.
Forfeiture remains unsupported until its separate saved event exists.

## 6. Proof run

The selection seed is team6-held-bail-five-places. It selects actual places
in New Hampshire, Maine, Arkansas, Virginia and South Dakota. Identity
selection is the only test draw; no monetary outcome is drawn.
The first run passed ten deposit/refund checks. Its five canonical reload
failures came from an undefined optional field authored by the fixture.
That field was removed without changing production serialization.
The expanded run passed 30 of 35 checks. Its five federal fixture failures
were missing national budget openings, repaired through existing canonical
national-jurisdiction and budget-opening helpers. No production logic changed
for either fixture repair. The renewed run passed all 35 checks on current
main 8194aed3 plus the exact Team 9 dependency. Five named-person court
fixtures cover deposits, refunds, reload/repeat, forecast refusal and ordinary
cash. Ten additional controlled ledger checks cover existing state and
federal accounts; they do not assert new court authority.
Scoped TypeScript checked three roots and loaded 975 source files, with zero
owned diagnostics. Lint, formatting, release and report checks passed. The
dice gate reports zero new findings and five stale inherited allowlist entries.
Exact saved IDs and tested heads are in m5-held-bail-proof.json beside this
walkthrough.
No whole suite, browser, natural campaign or nationwide effect proof is
claimed by these direct accounting fixtures.

## 7. Worked example

Lance Ross in Alton, New Hampshire is person_a94014641d35ebff. The fixture
records his charge at saved court us-nh:general_trial and pays $100.00 through
Team 9's producer. Deposit resource-flow_d388c14aa887b361 and completed outcome
resource-transfer-outcome_693aad25179b9151 reach organization_a634a08569fa4590.
Physical cash becomes $100,000,100.00; spendable balance plus government
reserve remains $100,000,000.00. That opening account amount comes from the
existing fixture account writer, not a researched government balance.
Held liability is $100.00. The saved case-close refund uses
resource-flow_faeaa2629dcbaf69 and resource-transfer-outcome_c2b96cd0eaf635f4.
Physical cash and held liability both decrease by $100.00. Neither transfer
becomes operating money. Canonical reload and repeat preserve the exact IDs.
Riley Park in Alfred, Maine; Kevin Ortiz in Acorn, Arkansas; Kenneth Le in
Abbs Valley, Virginia; and Elliott Wynn in Aberdeen, South Dakota pass the
same checks, with their separate saved identities recorded in the proof.

## Remaining contracts

The dependency is published as a draft, not merged. This consumer requires
CTO review at its exact head and composition with Team 9's producer source.
Historical-cutoff account identity and per-family legal tax-term admission
remain separate M5/M7 contracts. No account alias, second treasury, new tax
mapping or fabricated forfeiture is introduced.

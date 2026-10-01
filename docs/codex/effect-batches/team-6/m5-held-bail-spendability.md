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
in New Hampshire, Maine, Arkansas, Virginia and North Dakota. Identity
selection is the only test draw; no monetary outcome is drawn.
The first run passed ten deposit/refund checks. Its five canonical reload
failures came from an undefined optional field authored by the fixture.
That field was removed without changing production serialization.
Renewed proof and exact saved examples are recorded after terminal results.
No whole suite, browser, natural campaign or nationwide effect proof is
claimed by these direct accounting fixtures.

## 7. Worked example

The fixture records a charge for an actual saved person and court, then
pays a controlled $100.00 deposit through Team 9's canonical producer.
Physical account cash increases by $100.00. Held liability also increases
by $100.00, so spendable balance plus government reserve does not increase.
The actual case-close refund pays the original payer. Physical cash and held
liability both decrease by $100.00. Neither transfer becomes operating money.
Canonical reload and repeat settlement must preserve the exact saved IDs.

## Remaining contracts

The dependency is published as a draft, not merged. This consumer requires
CTO review at its exact head and composition with Team 9's producer source.
Historical-cutoff account identity and per-family legal tax-term admission
remain separate M5/M7 contracts. No account alias, second treasury, new tax
mapping or fabricated forfeiture is introduced.

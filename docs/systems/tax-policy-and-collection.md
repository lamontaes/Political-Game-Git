# SYSTEMS30-F — Tax policy and collection

The bounded tax consequence loop uses canonical legislation, the existing
resource ledger, the canonical future-due frontier and the existing publisher.
It changes no Stage 6 metric/effect semantics and preserves the Budget reader.
The current authorizer is SYSTEMS30 shared instructions and S30-F in the
[shared document](https://docs.google.com/document/d/1pM8gxmyTyBPc751q_eHd9FoGHsVaRq4SHMnQt1IXQY0/edit).

## Sourced authority and explicit model

The first executable route is an authored prospective Alaska state selective
excise. Its power/date/public-purpose/general-receipt constraints come from the
[official Alaska Constitution](https://ltgov.alaska.gov/information/alaskas-constitution/),
article II sections 1 and 18, and article IX sections 1, 6, 7 and 13. The acquired
constitution is the existing hash-locked `ak-constitution` artifact. The export
opens a separately declared, pinned enacted-text scope through the production
capability; acquisition bytes, original legislature scope and rights metadata
are preserved. Publisher navigation, pictures and editorial material are not
exported. `scripts/source/export-tax-powers.ts --check` proves the projection.

This does not claim an existing real tax, rate, base, receipt or treasury
balance. The acquired wording is a dated baseline, not a verified amendment
chain. Each proposal requires the explicit
`carry-forward-acquired-baseline-in-game` assumption. Legislative changes in the
saved World create prospective typed policy versions; they never assert future
real-world legal continuity. The twelve admitted Alaska borough/city claims and
their foundational/observed-point query contract remain unchanged. A local
sales/property levy still needs the correct supported governing procedure,
cap/exemption and voter-approval facts. This state route grants none of those.

The model supports USD, exact rational shares from zero through one, a declared
base/allowance/exemption class and half-up rounding to cents. These share/lag
bounds are model bounds, not statutory caps. There is no merchant inventory,
underlying purchase/income transfer, tax-return engine, federal tax system,
interest/penalty, behavior response or macroeconomic forecast. A declared base
creates no money. The compressed settlement transfers an assessment from the
existing payer position directly to the modeled general public account.

## One canonical path

1. `fileTaxProposalFromOffice` re-resolves the controlled person's actual member
   seat, source pack, jurisdiction, origin chamber and regular-session entry.
   It introduces a canonical revenue measure, files an exact tax-levy provision,
   attaches `TaxProposalRecord`, and creates the existing Work item. Staff jobs,
   cached contexts and selected map places grant no introduction authority.
2. S's `resolveLegislativeAssignmentForMeasure` consumes the returned measure ID
   and retains the existing legislative steps. F supplies no votes, executive
   response, alternate law store or electoral evaluation.
3. The existing legislative action publication boundary notices a newly enacted
   supported tax. Only unchanged adopted levy text records `TaxPolicyRecord`.
   Its effective date is ninety days after actual enactment under the filed
   clause. Passage, signature, rendering and reload never collect money.
   Changed unsupported text remains enacted law with an explicit unavailable
   effect; the action is not rolled back to install stale terms.
4. `declarePersonalTaxOccurrence` is an explicit current-character action. It
   records a private current occurrence and `TaxBaseRecord`; no backdated base
   or duplicate source occurrence is admitted.
5. `assessTaxBase` selects the version effective at the occurrence, freezes exact
   taxable/tax amounts and creates one named canonical due item. New versions
   cannot reprice or recollect an earlier occurrence in the same tax series.
6. The ordinary time-handler composition runs the collection on its exact due
   date. It appends one `TaxCollectionRecord` plus the existing resource flow
   and transfer outcome. Positive collection debits the actual payer and credits
   the same-jurisdiction public account. Missing cash/position produces a terminal
   failure and no receipt. Explicit zero resolves without fabricating a transfer.
7. Policy and successful public-receipt publications bind their own canonical
   source records. Payer/base details stay private. Public adapters expose only
   date, amount, measure, public account and public source event.

The public organization is `public-government:${jurisdictionId}` in the existing
organization store. Its known zero USD opening is solely the modeled receipts
account; unknown real treasury cash remains unknown. Personal, household,
public and campaign positions remain distinct. Campaign organizations and
public-account self-transfers are refused by this bounded tax/payout route.

## T's public-payment seam

`settlePublicResourcePayment(world, input, resolveFunding)` consumes T's pure
canonical funding resolver. `input` carries funding/enactment ID, measure ID,
expected adopted provision IDs, stable operation key, positive exact requested
amount and canonical recipient. No member-as-executive authority is inferred.

The derived `PublicFundingMandate` must bind an enacted appropriation, exact
adopted amount, explicit government administrative directive, operative date,
availability/expiry and program. Unknown generic old appropriations refuse.
Collection supplies cash; it supplies no appropriation or transit authority.
The adapter checks actual same-jurisdiction public liquidity and cumulative
payments against the enacted amount, then posts one ordinary resource flow and
outcome. A typed `public-funding` basis snapshot preserves source identity and
operation. Successful replay returns the existing outcome; changed replay,
insufficient cash or unavailable authority writes no payment. Reload checks
reconstruct cash and funding at each payment's exclusive sequence. T remains
the program/service/price/expiry/repeal interpretation owner; F owns settlement.
No separate ledger, treasury, appropriation engine or clock is introduced.

## Delivery and acceptance

The root mounts `TaxWorkWorkspace({world, personId, onWorldChange,
onOpenMeasure})` as the Politics surface "Taxes and public receipts"
(`nav-politics-tax`). Each proposal can be followed through its owner-accepted
Alaska revenue sitting and the existing legislative workspace in place, and the
surface shows the public account's recorded cash. Before 2026-09-14 the root
had no tax mount and a filed tax had no decision producer. `onOpenMeasure` consumes S's shared measure adapter;
`onWorldChange` persists the same World and normal time controls retain the
canonical handler composition. Neither component nor read adapter owns storage.
Budget remains the public observational/aggregate reader and is not a levy gate.

Headless tests use existing institutional writers and explicitly authored
scenario decisions, rather than synthetic enactments or electoral forecasts.
A fixture/component proof does not establish ordinary seat reachability or
human visual acceptance. The delivery report must name the frozen SHA, actual
checks and separate kernel/adapter/root-mount/installed/human acceptance states.

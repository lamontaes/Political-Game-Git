# Explicit recorded legislative sitting

The ordinary filed-bill route can admit the existing fictional Alaska
appropriation sitting as explicit content. This is separate from institutional
access: an authored sitting is never the universal drafting, filing or
inspection gate. No other state's rules or colleagues are copied into Alaska,
and this sitting supplies no congressional authority.

## Source and admission

The source is the accepted `alaska` blueprint in
[`legislation-scenarios.ts`](../../src/simulation/legislation-scenarios.ts),
Village Transit Support: recorded committee/floor ballots, executive veto and
joint override ballots. These are authored game records, not observations of
real officials or assessments of the player's proposal. The existing Alaska
rule pack continues to govern each act. Its appropriation override rule uses
three fourths of legislative membership, as specified by Article II, section
16 of the [Alaska Constitution](https://ltgov.alaska.gov/information/alaskas-constitution/).
No legal rule or current real official is invented by this adapter.

`prepareRecordedLegislativeSitting(world, { measureId, playerPersonId,
playerBallot })` requires the controlled person's reconciled active winning
member seat, matching jurisdiction/pack, filed appropriation-family lineage,
and an explicit categorical player ballot. The UI has no selected ballot by
default. The choice covers supported questions in that member's chamber and
the joint override. Other members' ballots remain the source's recorded
fictional choices. No decision evaluator, political score or election
prediction is added.

Admission records a canonical event with the source version, exact current
bill text, seat identity, explicit player ballot and existing stable fictional
colleagues. A repeated identical admission is idempotent. A different ballot
cannot silently overwrite it. Changed text, source decisions or seat identity
withholds the old admission. Rendering and reload create no sitting or people.
Current real committee membership remains unknown; the sitting's explicitly
authored membership applies only within this content.

## Alaska revenue sitting profile

On 2026-09-14 the owner accepted a second, separate profile,
`alaska-revenue-recorded-v1`, because an enacted tax is the only producer of
public cash and no revenue decision producer existed. It applies only to a
filed revenue measure whose exact pinned tax proposal, terms and text pass
`readFiledTaxContentIdentity`. The appropriation sitting's Village Transit
Support ballots are never admitted for a tax.

Its content lives in `legislative-authored-sitting.ts`: committee 4–3 in each
chamber, House 22–17 with one absent, Senate 11–9, and a Governor's signature.
The counts fill the authored 40/20 rosters and clear a majority of the
membership. Because the bill is signed, no Article II section 16 override
threshold is claimed. The existing Alaska rule pack still governs every act,
and the tax keeps its own filed ninety-day effective clause. The admission
identity binds the profile, these decisions, the tax content key, the member,
the seat and the exact current provisions. Amended text withholds it, and
earlier appropriation admissions keep their unchanged identity.

`recordedSittingOffer` supplies the disclosure and ballot scope before the
choice. `RecordedSittingAdmission` is the one control, used by the Docket and by
Tax work. A filed tax is not a docket bill, so Tax work follows its procedure in
place through `resolveLegislativeAssignmentForMeasure` and the existing
`LegislationWorkspace`, publishing through the legislative action boundary.

## Existing consumers

`resolveLegislativeAssignmentForMeasure` reads an already admitted sitting.
`applyLegislativeCommand` rechecks its current evidence and calls the accepted
committee, calendar, floor, transmittal, enrollment, presentment, executive,
override and enactment writers. Recorded votes carry the admission event ID
in their existing authored provenance. The player's canonical disposition is
their explicit ballot, not a source-default ballot or an evaluator output.

`recordedInstitutionalStepRequiresWait` distinguishes another chamber's acts.
Those use `await-institutional-record`; direct member acts in that chamber
remain refused. Enrollment/presentment requests and executive waiting retain
their existing actor meanings. This introduces no executive power for the
member and no alternative law engine.

Canonical enactment remains distinct from effective date and implementation.
The adapter supplies no inferred effective date or public money. T's pinned
prospective clause and F's real receipt/effect consumers retain their own
contracts. Ordinary election production and human visual acceptance are
separate proofs from a supplied-result fixture exercising this adapter.

The recorded-ballot admission supplies no deliberation decisions. Its bill
cannot enter the older numerical bargaining evaluator: the members-room
control is withheld for this content, and the underlying opener refuses it
without mutation. Historical non-admitted fixture behavior is preserved.

Hearing and legislative-day waits call `passOrdinaryDays` with their hearing
handler composed into the lazily created shared ordinary registry. They use
the existing protected minute-clock loop and retain other canonical due
families; no date jump bypasses a confirmed appointment. An interrupted hearing
retains its existing pending due item on retry. Messages distinguish a held
hearing/reached floor date from a wait stopped at a commitment. T owns its
transit handler's composition into the existing shared registry; S adds no
transit, payment, election or decision producer.

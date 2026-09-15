# Constitutional and charter process

S30-K extends measure identity and the shared legislative vote builder with a
separate typed process. Constitutional proposals never enter ordinary floor
amendments, executive presentment or presidential veto. Optional canonical
history families preserve old saves; World integrity replays source, body,
identity, chronology, tally and operative rule guards. Reads do not write.

## Acquired authority and supported actions

Eight artifacts observed 2026-09-13 live in the registered
`constitutional-process` source domain. Raw bytes, retrieval receipts, enacted
text rights boundaries and excerpt checks precede the browser projection.
`source:replay` verifies that projection as well as the compiled corpus. Earlier
applicability remains unestablished; this increment refuses proposals before
its source observation date.

| Process                                     | Supported institutional record                                                                              | Ratification and dates                                                                                                                                                    | Current entry and effect                                                                                                                                                                       |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Federal Article V amendment                 | Congress proposal; two-thirds present in both houses with quorum; complete recorded membership dispositions | Authenticated actions of Congress-designated state legislatures or conventions; 38 of the current 50 states, no DC; explicit proposal deadline and later operation clause | Canonical writer and public tracker; prospective proposal-threshold consumer. Congressional elected-office/player sponsorship consumer is absent on this base.                                 |
| California legislative amendment / revision | Each house's membership denominator: 80 Assembly, 40 Senate; two-thirds, recorded rollcall                  | Majority of votes cast on the measure; fifth day after Secretary of State statement filing; later operative clause retained                                               | Canonical writer, tracker and rule-version consumer. California elected-office/player sponsorship consumer is absent on this base.                                                             |
| Carson municipal charter                    | Link to the actual Nevada legislative measure and matching sponsor                                          | Require an enacted canonical Nevada enactment with its supported effective date                                                                                           | Tracker consumer/refusals implemented. Nevada committee/roster/enactment producer is unresolved in S30-S; positive charter enactment and open-ended charter rule effects are not demonstrated. |

Federal proposal/ratification authority: [Article V](https://www.archives.gov/federal-register/constitution/article-v.html),
[present-member denominator decision](https://www.law.cornell.edu/supremecourt/text/253/350),
[Article I quorum](https://www.archives.gov/founding-docs/constitution-transcript),
and [National Archives process](https://www.archives.gov/federal-register/constitution).
California: [Article XVIII](https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?lawCode=CONS&article=XVIII)
and [Article IV membership/quorum](https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?lawCode=CONS&article=IV).
Carson: [charter § 1.090](https://www.leg.state.nv.us/CityCharters/CtyCCCC.html)
and [NRS 218D.330](https://www.leg.state.nv.us/NRS/NRS-218D.html).
The latter specifies October 1 following passage unless the instrument prescribes
a different date. An enactment resolution timestamp alone does not prove passage
date; a missing canonical effective date stays unavailable.

## Ownership and meaning

Institutional writers ingest completed recorded decisions. They do not ask the
player to choose other members' votes or decide a statewide election. Source
coverage establishes a procedure, not an observed historical vote. Fixtures
explicitly identify authored journals, certification inputs and fictional game
text. Personal public positions require the controlled person and cannot count
as a body's ratification. An office title or residence grants no proposing seat;
only admitted office identities plus the actual winner/work chain may grant one.
No US/California office keys are invented for missing S/N consumers.

Text/version, sponsoring authority, proposal rule snapshot, source digest,
ratification mode, deadline and operative clause are immutable proposal records.
After ratification, a supported `proposal-threshold` delta appends a rule version.
The proposal rule resolver selects only versions operative at the date and
history frontier, so subsequent proposals use the changed fraction while older
proposals retain their original denominator and threshold. This is a fictional
modeled legal change, not a statement that current external law changed.
`text-only` proposals may record ratification but explicitly lack a modeled
consumer. No arbitrary clause parser claims otherwise.

Proposal conventions, initiative qualification, state convention internal
procedure, rescission/reconsideration and conflicting approved California
same-election provisions remain unresolved. Refuse only those actions. Rejected
California proposals do not trigger the conflicting-approved-provisions guard.
Local Carson charter committee/Board recommendations are authority for seeking
Nevada sponsorship, not local enactment. M owns those recommendations; S owns the
ordinary Nevada legislative measure. K never creates a second legislature.

## Integration and proof

`PoliticsWorkspace` preserves the Budget reader and adds the public tracker.
`docs/integration/systems30-k-politics-mount.patch` is the small shared-root change
for sole integrator A. Apply with `git apply --unidiff-zero` in an isolated proof
checkout. The patch is tested separately from K's delivery checkout;
it is not silently installed into A/main. The normal-route browser proof requires
`PG_S30_K_MOUNT=1` and that patch applied; default leaf testing runs the disposable
tracker fixture and explicitly skips the unmounted integration case.

Tests prove body/denominator/quorum, wrong mode and duplicate state refusal,
37/38 state boundary, deadline, ballot rejection, filing/effective/operative
separation, an actual changed proposal-threshold outcome, history/save continuity,
forged vote/rule refusal, controlled-person positions and missing charter producer.
Browser proof activates native controls by pointer and keyboard and reloads the
recorded position. Automated proof, independent review, A's installation and
human visual acceptance are separate states.

## REST37-K canonical saved-World consumer

`proposeCaliforniaConstitutionalMeasure` binds an institution-authored proposal
to the existing `stateJurisdictionForKey("US-CA")` identity. It registers that
identity in the supplied World when an ordinary locality-started life lacks the
governing state, preserving geographic placeholder provenance, residence and
permissions. Its sponsoring authority is California Legislature; its process
is state amendment/revision and ordinary-measure link is null. A null sponsor
is institutional record ingestion, not a player sponsorship shortcut. Actual
member sponsorship still needs S/N's supported office/term consumer. No broader
ordinary legislative pack is asserted or created.

`constitutionalProposalRuleForWorld(world, {jurisdictionId, processKind})`
returns availability and the actual World ID, date, history frontier and detached
rule. It accepts no future date or another life's manifest. Proposal commitments
consume this snapshot. The existing historical inspector also returns a detached
rule, preventing accidental writes to saved law or the shared source baseline.
Locality identity and charter/ordinary-bill kinds cannot enter this consumer.

`constitutional-saved-world.test.ts` uses the actual ordinary creator for two
distinct Sacramento lives, advances the existing canonical clock, ingests openly
authored completed institutional decisions, and saves/reopens through the ordinary
World codec. It covers rejected ratification, filed/effective/delayed-operative
boundaries, an earlier proposal retaining its rule, a later proposal's changed
vote requirement/outcome and the unchanged other life. No simulated real-world
vote or autonomous political judgment is claimed. The modeled threshold delta
is the same explicit fictional text supported by the existing K mechanism.
Both distinct generated lives are also saved and loaded through the existing
SQLite repository at `:memory:`. No save file or arbitrary environment destination
is exported by this proof; on-disk/installed-game acceptance is not inferred.
This continuation introduces no new real-law operative claim; the primary-source
body/denominator/filing rules above are retained unchanged.

Independent local code/proof is deliverable without exporting publisher bytes.
Export remains withheld, not silently narrowed to a code-only workaround. Exact
restricted publisher files and the separate recipient/signature-payload restriction
are named in `docs/plans/active/rest37-k.md`. A/FABLE-UI's mount, independent review,
installed delivery and human acceptance remain separate; this slice changes no
root, visible controls, writing requirement, costs or clock.

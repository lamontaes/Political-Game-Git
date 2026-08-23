# Core Life, Organizations, Households, and Time Demand

Stage 5 Run A provides persistent identities and dated histories for the ordinary life around politics. It is a headless domain foundation, not Life Mode content, an hourly calendar, or a player-facing workload meter.

## Identity and History

Organizations, work relationships, education enrollments, non-work organization participations, households, household memberships, kinship relationships, partnerships, care responsibilities, and child authorities have stable semantic-key IDs. Their profiles and lifecycle changes are separate append-oriented records in the world's one global history sequence. Every transition is immutable, provenance-bearing, chronology-checked, and queryable by an as-of date plus exclusive sequence cutoff.

The following concepts are deliberately not aliases:

- an organization is not its current name, location, or later institutional detail;
- a work relationship is not an occupation label, current-career slot, or office;
- education enrollment is not employment or generic membership;
- non-work participation is not actual work, and an activity need not create a new organization;
- a household is not a family, partnership, dwelling, or jurisdiction;
- household membership is not kinship or care;
- kinship is not partnership; and
- care may be shared, may cross households, and does not imply co-residence; and
- child authority is not kinship, care, partnership, or co-residence and may be held by a person or organization.

Open content uses validated semantic namespaces for organization classification, work kind, occupation classification, education program/context, participation/role/context, child-authority kind/basis, household location/membership kind, kinship, partnership, care, eligibility actions/reasons, and exceptional life commitments. Lifecycle states, compensation, work authority, dependency, economic risk, residence role, care share, and time-demand dimensions remain closed because their values drive validation or behavior.

`LifeRecordProvenance` distinguishes authored records, records derived from an earlier simulated event, and dated source records. It is intentionally not an arbitrary metadata object.

## Organizations and Progressive Detail

`Organization` owns stable identity, formation date, provenance, and lightweight/detailed resolution. Effective-dated `OrganizationProfileRecord` entries own the display name, classification, and jurisdiction location, so renaming or relocation never changes organization identity. `materializeOrganization` promotes resolution without creating an in-world occurrence or rewriting profile history.

This identity is the extension seam for schools, employers, associations, businesses, parties, campaigns, agencies, courts, and other institutions. Run A uses it for enrollment, participation, and organization-held child authority without implementing organization hierarchies, ownership, finance, institutional powers, or law.

## Actual and Expected Work

`WorkRelationship` represents one actual or expected engagement between a person and an organization or an independent economic activity. Multiple relationships may coexist. The root preserves compensation, authority, dependency, economic-risk semantics, provenance, when the relationship was recorded, and its actual or expected start date.

Effective-dated `WorkStatusRecord` entries support expected, active, temporarily inactive, and ended histories. Expected future work is inspectable and persistable but is not active and contributes no load. It becomes active only through a dated status transition at or after its start date. Effective-dated `WorkRoleRecord` entries preserve title, open occupation classification, work location, and time demand; promotions and changed demands therefore do not overwrite earlier roles. Ending or pausing one relationship does not affect another.

The Stage 2 `OccupationFact` remains an immutable biography/expertise summary and compatibility input. It is not canonical detailed work truth. Shared-work queries prefer overlapping work relationships at the same stable organization. The textual employer fallback is used only when neither person has canonical Stage 5 work, so text never competes with established organization identity.

Political office is not special-cased here. Later institution systems may connect a typed office-holding relationship to the same person and organization identity without turning every job into an office.

## Education and Non-work Participation

`EducationEnrollment` is the canonical stable relationship between a person and a school or other educational `Organization`. Its root records the actual or expected start, open program key, provenance, and recording date. Append-only state records support expected, active, completed, withdrawn, transferred, and ended histories with open context keys. A future expected enrollment remains inactive until an explicit effective-dated activation. Transfers preserve both enrollment roots, and later school renames remain profile history on the same organization ID.

`OrganizationParticipation` represents non-work membership or activity in an organization through an open participation key and optional open role/context keys. Expected, active, inactive, and ended states are separate history. Debate at a school can therefore reference the school without becoming enrollment or employment; a church youth group can reference another organization; and genuine volunteer service that functions as work remains a `WorkRelationship`.

Neither record embeds a second scheduler. Meaningful recurring education or participation demand is represented through the existing `LifeCommitmentRecord` and `TimeDemandProfile` seam.

## Households, Residence, Kinship, Partnership, and Care

`Household` is a persistent social/co-residence unit. Effective-dated location records let it move without changing identity. A stable membership plus state history represents resident/ended status, primary/secondary/shared residence role, and open membership kind. One person may validly have simultaneous secondary or shared residences, but overlapping primary memberships are rejected. Household locations reference jurisdictions and human-readable place labels; dwellings, leases, ownership, and housing finance remain Run C work.

`KinshipRelationship` records canonical paired kinship through a kin-only open namespace. `Partnership` has its own active/ended state history. `CareResponsibility` has its own caregiver and recipient identities plus active/ended states, responsibility share, context, and time demand. This supports unrelated co-residents, related people living apart, former partners who remain kin through children, and cross-household or shared care without inference between those concepts.

`ChildAuthority` is a separate directed relationship from a child person to either a person or organization holder. Its open authority and basis keys describe the structural relationship; active/ended state history preserves its effective dates. Recording it never infers or mutates kinship, partnership, care, or household membership. This supports a parent holding authority while a grandparent supplies care and residence, a relative guardian without fabricated family state, and agency authority with a separate foster or kin caregiver.

Legacy residence, family, education, and occupation biography facts remain immutable compatibility/background summaries. Canonical Stage 5 history wins when a corresponding sequence-aware record exists; legacy facts are fallback or summary only and keep their original IDs without fabricated append sequences. New detailed co-residence, work, education, participation, partnership, care, and authority use dedicated records. Run A does not silently rewrite older facts or implement custody law, relationship maintenance, playable formative life, or resource transfers.

## Time Demand, Load, and Recovery

`TimeDemandProfile` records an expected weekly whole-hour range plus attention demand, concurrency potential, schedule rigidity, interruptibility, and an optional jurisdiction constraint. The expected range is descriptive rather than a literal 168-hour subtraction. Concurrent low-attention care can therefore consume less exclusive capacity than an equally long non-interruptible responsibility, while conflicting rigid/location-bound demands add coordination pressure.

`assessLifeLoadAt` combines active work roles, active care responsibilities, and effective exceptional life commitments into deterministic expected and exclusive-equivalent ranges, qualitative coordination pressure, a qualitative load band, and inspectable contributors. Education and participation contribute only when content records an ordinary commitment for their meaningful demand. These diagnostics are not universal measures of health, productivity, family quality, or moral worth and are not exposed as player meters.

`resolveLifeLoadPeriod` resolves a completed seven-day period with normal, push, or recover effort and limited, adequate, or substantial recovery. A short push may raise immediate output, but accumulated fatigue reduces later output and capacity; recovery can restore capacity. Resolution appends a `LifeLoadResolutionRecord` and represents any resulting recovery debt through the existing Stage 4 `TemporaryStateRecord` with `life:fatigue`. There is no parallel fatigue subsystem and advancing time alone does not invent load resolutions.

The current qualitative thresholds are deterministic gameplay calibration, not a medical or labor-science claim. Later playtesting may revise calibration without collapsing the underlying demand dimensions.

## Queries and Persistence

The public life query API includes organization/profile history; work relationship/status/role history; active work and stable shared-organization work; education and participation lifecycle history; shared school identity across student and worker histories; household location/membership and jurisdiction residence; kinship, partnership, care, and child-authority history; commitments, load assessment, load-resolution history, and active fatigue.

All canonical life queries use date plus append-sequence availability. This distinguishes historical state from later-appended backfill and preserves unrelated insertion-order independence. Stable life roots and state records participate in integrity checks for IDs, append order, references, chronology, lifecycle transitions, supersession, taxonomy, provenance, residence overlap, and stored load derivation. A closed typed life-history reference lets Stage 4 perceptions, appraisals, decisions, and frozen source snapshots cite only actor-involved canonical records that existed before their date-and-sequence cutoff.

World schema 8, generator `demo-world-v8`, and snapshot format 7 serialize the complete Runs A/B graph, generated provenance, bounded context people, and typed life sources through deterministic JSON and the Node-only SQLite repository. Unsupported older versions remain rejected until a migration chain exists.

## Run B Character-History Composition

`CharacterHistoryPlan` is the only Run B production boundary for played, quick-generated, and manually authored histories. It orchestrates the existing organization, household, care, authority, enrollment, participation, work, commitment, event, relationship, knowledge, memory, appraisal, temporary-state, and development-proposal APIs; it is not a stored history family. Generated pre-play construction uses closed `generated` provenance, while manual and event-backed records retain authored and simulated-event provenance.

Formative resolution is sparse: ages 0–7, 8–12, and 13–17 are pacing bands with increasing agency and bounded anchor-scene budgets, not a maturity stat, legal rule, or weekly scheduler. Starter situations cover household/school context, peers, teachers, activities, civic volunteering, teen work, and future preparation. Teen work asks the eligibility provider. Context people are ordinary stable `Person` records; teachers use ordinary school work, peers share ordinary context, and relationships remain derived from their records.

Adult-path helpers compose rather than replace the shared graph. Apprenticeship combines training enrollment, paid work, mentor interaction, commitment, and a completed enrollment state. Guard/Reserve activation temporarily inactivates civilian work and later resumes it. PCS records household-location history, including an open overseas location identity, without a foreign-government model. Run C still owns amounts, payment cadence, resources, debt, housing, care costs, and final relationship-resource integration.

## Eligibility Consumer

`evaluateLifeEligibility` accepts an actor, open action key, date, stable jurisdiction ID, optional stable context IDs, and an injected `LifeEligibilityProvider`. The result is allowed or blocked with validated open reason keys and structured explanation data. The default provider permits actions but encodes no universal age threshold. Stage 7 can later supply effective-dated law and institutional rules without replacing any Stage 5 entity.

## Explicit Boundary

Run B owns playable formative/adult life paths and education/career progression content. Run C owns finance, resources, housing/property, and relationship integration. Stage 6 owns the generalized event engine. Stage 7 owns mutable law, effective eligibility rules, institutional powers, and territory-specific legal/political data. Campaigns, elections, political office, player scheduling UI, and polished player-facing presentation remain outside Run B.

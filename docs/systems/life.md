# Core Life, Organizations, Households, and Time Demand

Stage 5.1 provides persistent identities and dated histories for the ordinary life around politics. It is a headless domain foundation, not Life Mode content, an hourly calendar, or a player-facing workload meter.

## Identity and History

Organizations, work relationships, households, household memberships, kinship relationships, partnerships, and care responsibilities have stable semantic-key IDs. Their profiles and lifecycle changes are separate append-oriented records in the world's one global history sequence. Every transition is immutable, provenance-bearing, chronology-checked, and queryable by an as-of date plus exclusive sequence cutoff.

The following concepts are deliberately not aliases:

- an organization is not its current name, location, or later institutional detail;
- a work relationship is not an occupation label, current-career slot, or office;
- a household is not a family, partnership, dwelling, or jurisdiction;
- household membership is not kinship or care;
- kinship is not partnership; and
- care may be shared, may cross households, and does not imply co-residence.

Open content uses validated semantic namespaces for organization classification, work kind, occupation classification, household location/membership kind, kinship, partnership, care, and exceptional life commitments. Lifecycle states, compensation, authority, dependency, economic risk, residence role, care share, and time-demand dimensions remain closed because their values drive validation or behavior.

`LifeRecordProvenance` distinguishes authored records, records derived from an earlier simulated event, and dated source records. It is intentionally not an arbitrary metadata object.

## Organizations and Progressive Detail

`Organization` owns stable identity, formation date, provenance, and lightweight/detailed resolution. Effective-dated `OrganizationProfileRecord` entries own the display name, classification, and jurisdiction location, so renaming or relocation never changes organization identity. `materializeOrganization` promotes resolution without creating an in-world occurrence or rewriting profile history.

This identity is the extension seam for later schools, employers, associations, businesses, parties, campaigns, agencies, courts, and other institutions. Stage 5.1 does not implement those domain systems, organization hierarchies, ownership, membership, finance, or law.

## Actual and Expected Work

`WorkRelationship` represents one actual or expected engagement between a person and an organization or an independent economic activity. Multiple relationships may coexist. The root preserves compensation, authority, dependency, economic-risk semantics, provenance, when the relationship was recorded, and its actual or expected start date.

Effective-dated `WorkStatusRecord` entries support expected, active, temporarily inactive, and ended histories. Expected future work is inspectable and persistable but is not active and contributes no load. It becomes active only through a dated status transition at or after its start date. Effective-dated `WorkRoleRecord` entries preserve title, open occupation classification, work location, and time demand; promotions and changed demands therefore do not overwrite earlier roles. Ending or pausing one relationship does not affect another.

The Stage 2 `OccupationFact` remains an immutable biography/expertise summary and compatibility input. It is not canonical detailed work truth. Shared-work queries prefer overlapping work relationships at the same stable organization. The textual employer fallback is used only when neither person has canonical Stage 5.1 work, so text never competes with established organization identity.

Political office is not special-cased here. Later institution systems may connect a typed office-holding relationship to the same person and organization identity without turning every job into an office.

## Households, Residence, Kinship, Partnership, and Care

`Household` is a persistent social/co-residence unit. Effective-dated location records let it move without changing identity. A stable membership plus state history represents resident/ended status, primary/secondary/shared residence role, and open membership kind. One person may validly have simultaneous secondary or shared residences, but overlapping primary memberships are rejected. Household locations reference jurisdictions and human-readable place labels; dwellings, leases, ownership, and housing finance remain Stage 5.4 work.

`KinshipRelationship` records canonical paired kinship through a kin-only open namespace. `Partnership` has its own active/ended state history. `CareResponsibility` has its own caregiver and recipient identities plus active/ended states, responsibility share, context, and time demand. This supports unrelated co-residents, related people living apart, former partners who remain kin through children, and cross-household or shared care without inference between those concepts.

Legacy residence and family biography facts remain immutable summaries. New detailed co-residence uses household records; new partnership and care truth uses their dedicated records. Stage 5.1 does not silently rewrite older facts or implement custody law, relationship maintenance, children/formative play, or resource transfers.

## Time Demand, Load, and Recovery

`TimeDemandProfile` records an expected weekly whole-hour range plus attention demand, concurrency potential, schedule rigidity, interruptibility, and an optional jurisdiction constraint. The expected range is descriptive rather than a literal 168-hour subtraction. Concurrent low-attention care can therefore consume less exclusive capacity than an equally long non-interruptible responsibility, while conflicting rigid/location-bound demands add coordination pressure.

`assessLifeLoadAt` combines active work roles, active care responsibilities, and effective exceptional life commitments into deterministic expected and exclusive-equivalent ranges, qualitative coordination pressure, a qualitative load band, and inspectable contributors. These are simulation diagnostics, not universal measures of health, productivity, family quality, or moral worth and are not exposed as player meters.

`resolveLifeLoadPeriod` resolves a completed seven-day period with normal, push, or recover effort and limited, adequate, or substantial recovery. A short push may raise immediate output, but accumulated fatigue reduces later output and capacity; recovery can restore capacity. Resolution appends a `LifeLoadResolutionRecord` and represents any resulting recovery debt through the existing Stage 4 `TemporaryStateRecord` with `life:fatigue`. There is no parallel fatigue subsystem and advancing time alone does not invent load resolutions.

The current qualitative thresholds are deterministic gameplay calibration, not a medical or labor-science claim. Later playtesting may revise calibration without collapsing the underlying demand dimensions.

## Queries and Persistence

The public life query API includes organization/profile history, work relationship/status/role histories, active work, stable shared-organization work, household location and membership history, residents as of a cutoff, jurisdiction residence, kinship, active partnerships, care state, active care, commitments, load assessment, load-resolution history, and active fatigue.

All current queries use date plus append-sequence availability. This distinguishes historical state from later-appended backfill and preserves unrelated insertion-order independence. Stable life roots and state records participate in integrity checks for IDs, append order, references, chronology, lifecycle transitions, supersession, taxonomy, provenance, residence overlap, and stored load derivation.

World schema 6, generator `demo-world-v6`, and snapshot format 5 serialize the complete Stage 5.1 graph through deterministic JSON and the Node-only SQLite repository. Unsupported older versions remain rejected until a migration chain exists.

## Explicit Boundary

Stage 5.2 owns formative ages and content. Stage 5.3 owns adult education/career content and progression. Stage 5.4 owns finance, resources, housing/property, and relationship maintenance. Campaigns, elections, political office, government institutions, legislation, player scheduling UI, and polished player-facing presentation remain outside Stage 5.1.

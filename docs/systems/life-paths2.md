# LIFE-PATHS2 education, work and recruitment

This consumer implements the explicitly activated PLAYABLE-CONSUMERS2 section A.
Its source/design basis is research families L02/L05/L06/L07 and the owning
packet, Drive `1BQTTAZlOLQBVKQpzVGPfqEH8iD5kuH08aB8nIfibamc`.

## Canonical reuse

`life-paths2-catalog.ts` contains versioned fictional opportunities, not real
vacancies or inferred programs. The catalog is the availability provider; the UI
maps its supported entries rather than maintaining a separate fixed menu.

Study uses EducationEnrollment and append-only states. Each attended session has
one ScheduledActivity and a canonical completion event. Tuition is an actual
ResourceFlow/ResourceTransferOutcome after attendance. Completion requires both
the represented attended-session count and elapsed program interval. The completed
enrollment state records the credential, which subsequent entry predicates read.
Neither rendering nor enrollment grants a credential, skill, wage or experience.

The enrollment state vocabulary adds `temporarily-inactive`; returning preserves
the same enrollment ID and session history. Terminal withdrawals remain terminal;
a new enrollment is a new relationship, not a rewrite of the old one. Existing
version-15 saves load unchanged. New snapshots with an interrupted enrollment
require a binary supporting this added discriminator; older binaries fail their
existing integrity checks rather than silently dropping the state. No new World
record family or parallel snapshot format is introduced.

Personal employment uses WorkRelationship, WorkStatus and WorkRole. The authored
routes have different prerequisites, durations, schedules, responsibilities and
pay. Ordinary shifts complete through **Perform work** or as requested time
crosses the authored window; written deliverables are optional history, not a
requirement. Ten completed shifts establish an experienced role, and the explicit later
progression action changes future compensation terms. Exit preserves earned pay
and prior history. Interruption cancels future sessions and stops activity.

## Offers and compensation

A recruitment proposal creates an expected WorkRelationship beginning the next
day, with proposed resource-flow terms and an explicit offer/response event.
Acceptance does not post money or do work. Refusal ends that expected relationship.
A negotiated offer must be explicitly accepted; it remains inactive until its
start. Repeated offers use the same person/path response stream, so a refusal
cannot be rerolled by reopening a panel. Current expressed work intentions,
prerequisites, and existing rigid work constrain response. Kinship establishes a
contact, not consent, skill or loyalty.

Personal project compensation flows from the hiring person's resource account.
Campaign recruitment requires the controlled person's existing active campaign
and uses that campaign organization and treasury. It never accesses the personal
account as a fallback. Public-office hiring is unavailable: the accepted 92P
source schema describes classification, appointment/removal and labor fields but
contains no applicable authorization for this consumer's nepotism/volunteer
variants. `PublicEmploymentPermissionProvider` reserves the existing eligibility
seam; it does not assert permission or synthesize an office appointment.

Self-work pay uses the existing future-due registry on the day after an attended
shift. Delegated paid work waits for an actual ready-for-review result and pays
on a later day. Insufficient hiring-account funds record a missed payment, not
an invented transfer. Expected annual income never becomes spendable cash.
`LIFE_PATHS2_HANDLERS` must be composed with the caller's other registries.

## Delegation and shared owner seams

Accepted active recruitment creates ordinary WorkItems. Their source references
include the actual WorkRelationship. `projectStaffProgress` checks those linked
relationships, schedule availability and exclusive use of each assignee minute.
Ended or interrupted engagements cannot keep producing work. Completed output
remains a reviewable WorkItem with canonical outcome history.

The shared `activeLifePathWorkers(world, organizationId, interval?)` adapter in
`life-paths2-workers.ts` returns actual relationship/status/role/person identity
and calendar availability. EXEC-WORK2 consumes the frozen shared checkpoint
`4327921ed7da3ad891fe15630498e86bc69472e2`; its institutional role taxonomy remains
its own. It must include staff and principal work IDs as provenance.

OPENING-LIFE1 retains household, personality, opening, scenes and institution
source work. Its confirmed institution-provider interface requires a canonical
organization ID plus explicit program capability and provenance. A directory's
identity cannot activate a program. No source or opening files are replaced.

## Remaining source and integration boundaries

- 90 and 42A identify SIPP spells, CCD/IPEDS identity, O*NET/OEWS/ATUS and
  SCF/SHED universes; this branch does not claim empirical calibration from them.
  Authored program costs, wages and durations are labeled design.
- No new real institution program is enabled without program capability evidence.
- No public-office recruitment variant is enabled from unknown restrictions.
- UI-CORE-RELEASE, active PR #144 `codex/ui-core-release-transfer`, owns
  top-level navigation. `LifePathsPanel` is the feature-local adapter. The owner
  has applied ordinary Work routing in its combined checkout; actual normal
  player browser evidence remains pending on that combined candidate.
- The isolated `life-paths2-proof.html` has its own synthetic save namespace and
  is browser evidence only, never proof of normal navigation or human acceptance.

## Architecture audit and LEARN

The audit checks stable IDs, pure immutable transitions, history ordering,
source/fictional-world separation, access, refusal purity and same-version replay.
No Stage 6 policy/mind semantics, source corpus, household/personality, scene art,
App, PlayerGame or shared production navigation was changed. Existing time-work
provenance now admits dated canonical life references, with chronology retained.

LEARN: a valid staffing relationship is not enough; work execution must recheck
its active state, and assignment concurrency must consume the same person's time
only once. The departure and contention regressions enforce this at execution.

# State legislature dated queue producer

State legislative preparation can register a pack's next real calendar boundary instead of scanning every seated pack on each unchanged day. A wake invokes the existing intake, nomination, ballot, election or term writer for the affected pack. This producer does not change candidate decisions, vote counting or seat authority.

## API

The APIs are defined in `src/simulation/nationwide-world/state-legislature-queue.ts:94` and the exported planner and dispatcher in `src/simulation/nationwide-world/state-legislature-turnover.ts:1429`. The producer module exports:

- `prepareStateLegislatureQueue(world: World, before: IsoDate, throughYear: number): World`: preserves the existing opening/catch-up call once, then registers each opened pack.
- `reconcileStateLegislatureQueue(world: World, packId: string, throughYear: number): World`: replaces only pending future obligations when the pack's source inputs or horizon change.
- `stateLegislatureQueueRevision(world: World, packId: string): string`: reads the source fingerprint without creating history.
- `STATE_LEGISLATURE_QUEUE_HANDLERS`: composes into the existing canonical transition registry.
- `readStateLegislatureSavedWake(item: FutureDueItem)`: validates its saved version, pack, election date, stage, due date, revision, horizon, jurisdiction and stable identity.

The turnover module exports `stateLegislatureWakePlan(world, packId, throughYear, includeCurrentDate?)` and `dispatchStateLegislatureWake(world, wake)`. Dispatch requires the canonical World to be on the wake's exact date.

## Saved identity and dates

The saved-wake structure is defined in `src/simulation/nationwide-world/state-legislature-queue.ts:37`. Existing `futureDueItems` and `futureDueItemStates` hold all persistent schedule state. The transition key is `state-legislature:dated-wake-v1`. The stable key contains the version, pack, election day, stage, due date and source revision. A canceled obligation that becomes required again receives a deterministic reschedule generation derived from its terminal state sequence. Reopening a save retains those identities.

The authored provenance note holds a compact versioned payload: pack ID, election day, stage, due date, revision and horizon. Its referenced entity is the existing canonical legislature-opening event, and its jurisdiction is that pack's actual state jurisdiction. This payload is dispatch metadata, not an election result or legislative authority.

Intake dates use the existing seat cycle, candidate intake day and filing-window nomination plan. Ballots use the existing general-election date minus the existing ballot preparation interval. Elections use the existing state calendar. Filed primary dates and actual primary-record runoff dates remain pinned to their source fields. Term wakes come from recorded result `term-start:` tags. No routine monthly payroll records are changed.

## Source invalidation

The revision follows append-only source histories. It includes the pack's opening, seat/slate/nomination/result events, body-linked events, relevant contest and contest-result rows, campaign and campaign-state rows, office work relationships/statuses/roles, and canonical legislative enactments/provisions, rule-change provisions/bindings and constitutional measures/actions/rule versions. Law, rule, binding and district events conservatively invalidate the revision. Hashes cover record content, so a replaced record with the same ID and sequence is distinguished. An unrelated event append retains the revision.

Source revisions replace pending future obligations by canonical cancellation and scheduling writers. Same-day changes are revalidated against the current calendar rather than discarding still-valid due work. The queue schedules only the earliest future pack boundary; dispatch prepares its successors. The effective horizon covers at least four future years, retaining the next regular cycle in places whose elections are four years apart. The owner of the consumer must call reconciliation after relevant source changes and before advancing time.

## Consumer integration and limits

Consumer files are unchanged in this producer packet. Their owners must compose the registry, preserve the initial catch-up, reconcile recorded input changes, and replace the old daily turnover dispatch in one consistent integration. Registering these handlers while also retaining the old daily dispatch is not the intended integration.

The [retained annual receipt](https://github.com/lamontaes/Political-Game-Git/blob/452ea39988d6b3671f8ff1b86cd695eb1ec46506/docs/codex/evidence/session5-34-time-byte-profile.json) shows that the annual clock completed but exceeded the cap. The separate Save/Continue check exhausted its heap without producing a proof result. Producer equivalence and queue tests do not establish the complete historical speed, canonical save-size or player journey targets. A populated integrated measurement remains necessary after the consumer composition.

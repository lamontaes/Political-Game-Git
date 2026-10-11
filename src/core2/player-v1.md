# The player clock waits for an answer

Before: The life loop chose scheduled work itself, and an unanswered controller request fell back to an automatic choice.

After: The new process-local clock returns an outstanding choice until the client answers it. Each saved controlled decision carries its issued pause and offer IDs. Work and cash use the existing writers.

## Client API

Import the clock from `src/core2/player-v1.ts`, module stops from `src/core2/player-stops-v1.ts`, and saved traces from `src/core2/saved-trace-v1.ts`. The interface version is `core2-part1b-v1`.

```ts
type Moment = { date: string; minuteOfDay: number };
advancePlayerV1(core, { controlledPersonId, through: Moment });
resumePlayerV1(core, { kind: "choice", pauseId, offerId });
resumePlayerV1(core, { kind: "stop", pauseId });
earliestPlayerStopV1(core, { controlledPersonId, through: Moment });
resolveSavedTraceV1(core, recordId);
retirePlayerV1(core);
```

The clock accepts the actual core returned by the factory. It starts at midnight after the opening date, matching the life loop's first unprocessed day. Dates are civil dates; minutes can be fractional. Midnight at the end of a day is the next date at minute zero. Read the returned `at` for the exact frontier.

`advancePlayerV1` returns `choice`, `stop`, or `complete`. An unanswered choice returns the same packet. Answer only with its issued IDs. A consumed or unavailable answer throws before an act or payment. Scores and reasons come from the original scoring pass; answering does not score again. Reissue an advance request after a pending request completes to change its destination.

## Exact stops and durations

The pure stop query returns the earliest recorded work boundary or registered module stop, with all tied reasons. It never chooses or advances. The clock pauses at those boundaries and before controlled choices.

A module registers an actual stop with `registerModuleStopV1(core, { moduleId, recordId, controlledPersonId, at, kind, reasonKey, source, hold })`. Kind is `interrupt` or `offer-deadline`. The module must already be registered. A deadline is held. Its owner releases it with the exact token from registration through `releaseModuleStopV1`; a client cannot waive it. One-shot interrupts are consumed when acknowledged. Stops cannot be registered behind the owned frontier.

Offers include exact `durationMinutes` and their original score. Attendance carries its recorded work spans. Declining work takes zero minutes; its scheduled absence consequence remains pending until the recorded window ends. Work interruptions leave the accepted intention unposted. Attendance and earned pay post once the complete dated plan finishes. Changed owning terms reject progress rather than recording future work.

Ordinary discretionary offers must fit before the next recorded stop and midnight. The first version admits one discretionary choice after that day's scheduled work resolves. Day-level NPC work, payroll and finance run once when that civil day closes. Other residents keep their original cadence.

## Saved explanations and limits

The trace resolver returns saved reasons, scores and typed record references, with explicit missing or ambiguous statuses. It does not reconstruct motives or invoke money providers. Controlled traces remain visible without changing a person's tier or focus membership.

This clock is held in process memory. It does not serialize an unanswered choice. Retirement requires a completed civil-day boundary with no pending choice or intention. A callback failure after a committed step faults the session and prohibits automatic replay. General partial attendance, abandonment and death during unfinished work are not settled by this version.

## Checks

Measured: the latest file-set union contains 323 passing cases across recorded source versions. This is not one final-source full suite. It includes eight player-clock cases and the native import check. Final strict types, scoped lint, formatting, release and no-dice checks passed on the recorded source. In the randomly drawn generated place, seven complete controlled days produced eleven answered and saved controlled acts. Other residents recorded 18,081 acts. Twenty distinct saved-record lookups preserved the inspected public graph and owning records. Only one sampled record had saved full scores; twelve Source references were missing and remained explicit. [Generated-world receipt](receipts/m0-part1b-seven-days-20261011.json). [Gate receipt](receipts/m0-part1b-api-gates-20261011.json). This is an engine API; screen checks and the separate finisher's M0 acceptance remain pending.

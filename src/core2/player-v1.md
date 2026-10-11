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

Choices by the player, explicitly controlled person, and actual focus circle retain `compactChoice`, version `core2-compact-choice-v1`. It contains the actual chosen offer, its original offer index, the best other offered option, saved contribution numbers, and typed source references. Qualified offers with the same action and target remain distinct by their original positions. A controlled answer keeps the original evaluated numbers; it does not run providers again. Routine outsiders retain their result and short reason key. Their current attendance and earned-wage aggregates remain available without choice pairs or supporting trace copies. Open earned periods in the player circle retain their latest supporting attendance. Full player, focus-circle, and observer traces keep their existing score lists.

Relationship lookups expose the actual saved change’s choice when either endpoint belongs to the player circle, or observer mode is on. Relationships outside that scope retain their current result. Payment lookups add `paymentCause` from original completed accounting records, including amounts, dates, owners, and recorded components. Earned-period lookups add `earnedPeriodCause`, with the saved attendance choice labeled as supporting evidence. A payday or accrual is an accounting step and has no invented utility scores. Facts absent from the original record remain explicitly unavailable.

A past-fact ID on a person's `pastFacts` is a stored source address outside this ID-only resolver. A Director moment cites the actual person ID as `causeId` and preserves the original fact ID as `causeFactId`. The bench reads that fact from the person's `pastFacts`. Query a core explanation using an actual retained ID from `logByPerson` and confirm it in `durableLog`, or use the existing native work and finance record indexes. The director resolves its saved moments through its own `momentsById`; an unresolved school cause does not imply that the person's original fact disappeared. Do not invent a replacement event ID or utility scores.

This clock is held in process memory. It does not serialize an unanswered choice. Retirement requires a completed civil-day boundary with no pending choice or intention. A callback failure after a committed step faults the session and prohibits automatic replay. General partial attendance, abandonment and death during unfinished work are not settled by this version.

## Checks

The corrected attendance-copy boundary passed all 94 focused attendance, trace, and pay-period cases. All five static checks passed. The earlier composition passed 173 of 179 cases; its six unchanged life fixtures also fail on accepted Part 1 source. Compact explanations initially measured 13.58 simulated days per minute against 18.00 for that source, exceeding the 20% limit. The sealed-copy repair measured 14.86 days per minute, still 21.13% slower than the retained matched Part 1 baseline. The narrower focus-only policy passed 241 of 251 composition cases and all five static gates. The ten failures match the previously observed six life and four finance fixtures. Its 31-day median was 95.30 seconds, or 19.52 simulated days per minute, versus the retained matched accepted Part 1 source at 103.31 seconds and 18.00 days per minute. One warmup and three measured runs per variant gave 7.76% less elapsed time. Actual payroll, work, cash, and outside-flow totals matched. The judged year is running on an immutable code-only copy; no annual result is available. [Measured cost](receipts/m0-compact-explanations-cost-20261011.json).

The focus-only candidate matched the pre-compact source for the actual 301-person player circle over seven autonomous dates in Pleasant View, Utah. Original saved reasons, relationships, attendance, payroll, cash, and aggregates matched. Only three introduced explanation fields were excluded; the known facade version change was validated separately. Cash reconciled and source/input pins held. This is separate from the eleven answered-choice proof. [Autonomous circle receipt](receipts/m0-focus-circle-seven-days-20261011.json).

Historical all-resident policy: the original generated seven-day draw replayed the same eleven answers, issued offers, scores, reasons, durations, and final counts. Twenty original saved-record lookups remained pure. All 115 saved references resolved; none were missing or ambiguous. Twelve records expose direct compact choices. Eight accrued-pay records expose factual accrual causes with saved supporting attendance choices. Only one record has a full score list. This sample contains no payments; payment coverage comes from controlled native-writer tests. These engine checks do not establish screen or finisher acceptance. [Historical proof receipt](receipts/m0-compact-all-resident-seven-days-20261011.json). The focus-only policy intentionally omits outsider choice traces; the historical 115-reference count is not its acceptance result.

Earlier Part 1b receipt: the file-set union contains 323 passing cases across recorded source versions. This is not one final-source full suite. It includes eight player-clock cases and the native import check. Final strict types, scoped lint, formatting, release and no-dice checks passed on the recorded source. In the randomly drawn generated place, seven complete controlled days produced eleven answered and saved controlled acts. Other residents recorded 18,081 acts. Twenty distinct saved-record lookups preserved the inspected public graph and owning records. Only one sampled record had saved full scores; twelve Source references were missing and remained explicit. [Generated-world receipt](receipts/m0-part1b-seven-days-20261011.json). [Gate receipt](receipts/m0-part1b-api-gates-20261011.json). This is an engine API; screen checks and the separate finisher's M0 acceptance remain pending.

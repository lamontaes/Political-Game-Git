# Scene choices retain the records that put people there

The scene resolver now projects present people, expected people, and existing
choices separately. A calendar hold, work shift, contextual binding, or picture
cannot create attendance. Team 5 can consume the public types while retaining
its existing writers and reviewed text. Missing canonical location support
returns a developer coverage finding and no invented option.

## MERGED

Build repair #1194 landed at main24492950ece69558155e07e9b276ed59c5eb8c75.
This story implementation is a held draft on
`codex/team-8-story-resolver-contract`, PR #1196. The coordinator released
only `src/presentation/story-scene-resolver.ts` and its test to Team 8;
Team 5 owns player integration. Central claims and existing readers/writers
are untouched. Main2855854ca3537a1eacf5e1dd7591e593154c31bd was integrated
additively in this reused workspace, preserving the published proposal.

## 1. Why-chain

SOURCE FINDING: the resolver asks canonical meeting, completion, opening and
life-talk readers for the current snapshot. It does not rank people into a
fictional event. An entered meeting supplies its exact recorded roster and
existing comment choices through ordinary-meeting-scene.ts:16.

SOURCE FINDING: completion expires after later movement or a different
moment, as scene-venues.ts:190 requires. An actual latest arrival can establish
only the viewer at the exact activity while its interval remains active. If
no canonical chair/roster exists, no meeting choices are added.

SOURCE FINDING: currentOpeningLifeScene requires an unresolved saved scene
and alive participants. Quiet home preserves currentLifeTalkScene's existing
modeled household context, explicitly labeled modeled-home-context. A work
schedule bottoms out in authored job-pattern assumptions and remains expected,
never arrival. A contextual binding alone bottoms out in bookkeeping.

SOURCE FINDING: existing life-talk availability and hearing readers supply
options only when their entire physical roster fits the proven scene. Other
conversation families currently lack canonical location adapters here, so
coverage records that gap. No legal permission is inferred from missing data.

## 2. Research

No new causal study, effect size, rate or legal power applies to this read-only
projection. Existing job schedules remain game assumptions, not researched
presence rates. No direct-module fixed size or place multiplier was changed.
CTO3:45's world/place ranges and actual-person-reader requirement still apply
to any later effect; this draft creates zero new effect links.

## 3. Revisions and consumer contract

Exports from the new resolver module:

```ts
resolveStoryScene(world: World, request: StorySceneRequest): StorySceneResolution
```

StorySceneRequest fields are viewerPersonId, place, moment, and optional
addressee/audibility, using existing conversation types. Place is a discriminated
union with these exact fields:

- activity: activityId;
- opened-scene: eventId;
- household: householdId;
- workplace: organizationId, jurisdictionId, workPlaceCategory.

An opened-scene ID identifies its saved place context, not a label-based room.
A workplace category cannot establish a universal building. Unknown records
remain unavailable. Every clock field must equal the current snapshot;
historical/future requests return unsupported-moment with empty lists.

StorySceneResolution contains status, place, moment, snapshot, presentPeople,
expectedPeople, facts, priorSpeech, options and coverage. Status is resolved,
unsupported-moment, invalid-viewer or missing-place. Snapshot contains worldId,
nextSequence, actionSequence and moment. Person rows contain personId, name,
reader, reason and evidence. Evidence discriminates actual event, activity,
activity-state, household-membership/location, work-relationship and knowledge
IDs; derived quiet-home keys never pretend to be event IDs.

Option kinds and dispatch fields:

- conversation: subject, intent (existing option), addressee, audibility,
  listenerPersonIds;
- meeting-action: activityId, action;
- meeting-speech: activityId, choice, words;
- opening-choice: eventId, choiceKey, label.

Every option also carries evidence and snapshot. Facts/priorSpeech contain
text and evidence. Opening prose requires accurate viewer knowledge; existing
meeting agenda uses its canonical viewer-access reader. Prior speech retains
saved event text. Expected workers are restricted to self or employment
supported by the viewer's accurate source knowledge; private colleague records
are not exposed. Coverage is developer-only and must not become player copy.

Team 5 must resolve again before dispatch, compare snapshot/option identity,
and rebuild the existing writer input. Options contain no callback or retained
World. Existing writer guards, addressee correction, hearing, settled state,
IDs and history continue to govern commits. This module mounts no player UI.

## 4. What gets built, in numbered parts

1. Current recorded meeting, completion, arrival, opening and modeled home
   projection; separate expected invitation/work rows.
2. Existing meeting/opening/life-talk options with record evidence and revision.
3. Focused tests for purity, exact IDs, invitation/cancellation, arrival without
   roster, contextual-only bookkeeping, knowledge/privacy, hearing and stale
   snapshots. No shared writer or renderer edit.
4. Team 5 integration consumes the types; canonical adapters for additional
   contextual families require their actual location evidence, not room labels.
5. New favor/lie/endorsement options, historical/future as-of readers and broader
   continuity remain later parts. No facts or events are authored to fill gaps.

## 5. Simulated, records, world pieces, checks

SIMULATED: no new decisions or time advancement. RECORDS: read-only IDs from
existing history; no projection is persisted. WORLD PIECES: canonical readers
exist, but universal workplace arrivals and every contextual room adapter do
not. No shelter, relative, coworker, meeting chair or speech option is created
when its record is absent. CHECKS: final focused validation recorded below.

The generated Lexington fixture reached the public-room arrival but lacked a
canonical chair-backed meeting roster. That is retained as a negative control,
not fixed by inventing a production chair. A separate declared input fixture
adds a named chair to the saved notice before using the existing entry writer.
Fixture construction preserves IDs, dates, provenance order and known notice;
serialization integrity is checked. These are tests, not a watched playthrough.

Validation: final sole changed test file PASS, 10/10 in 9.22 seconds
(30.35 seconds including transform/import), maxWorkers2. Standard typecheck
PASS; strict source/test roots zero diagnostics; scoped ESLint, four-file
Prettier and whitespace PASS. Report check zero errors/warnings. Release gate
still reports inherited wave1-playtest-copy.md missing header, already reproduced
on clean main for the build repair. Earlier setup failures were real failures,
including a later notice violating activity provenance, invalid death/role
terms and an overlapping calendar fixture. Repairs stayed inside the new test;
no assertions, existing tests or production guards were removed.

Zero-dice gate: exit 1, zero new findings and three stale allowances, matching
the independently reproduced main baseline. No allowance refresh or suppression.

Measured same-snapshot read: cold 6.324 milliseconds, mean of twenty warm reads
1.656 milliseconds, 4,326 events. This is a unit-fixture read cost, not a game-year
speed or player integration result. Logs remain under test-results/team8;
portable fields and check receipts are published in the PR conversation.

## 6. Proof run

NOT RUN: browser/player integration, original portable-world proof, game-year
speed, full suite and independent helper. No new helper is authorized. The
original evidence ZIP remains absent here and its upload disposition unresolved.
Unit fixtures generate worlds for canonical record tests; they are not the
preserved Orange City life or human acceptance. The resolver is not mounted and
adds no daily simulation pass. Cold/warm read measurements use the same fixture.

## 7. Worked example

The fixture uses logged random locality Lexington, seed
`team8-story-resolver-part1`. An invitation offers expected attendance and no
speech. Actual arrival retains the viewer but supplies no fictional chair.
With explicit fixture chair evidence, canonical entry exposes the recorded
roster, agenda and three existing comment choices. After the canonical ask
comment, speech choices disappear, exact recorded words remain, and the
snapshot sequence advances. Names and amounts from a watched life are not
claimed. Next: publish final checks and consumer fields to coordinator/Team 5;
player integration and acceptance remain Team 5's lane.

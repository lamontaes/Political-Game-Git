# A scene should name the people the world puts there

The proposed story resolver joins existing presence and conversation readers
into one read-only result. It carries the record behind each person, fact,
and option. An invitation, relationship, picture, or contextual binding cannot
create attendance. Team 8 proposes the resolver and its tests; Team 5 owns
player integration. Agree on this contract before either lane edits a shared
reader or player surface.

## MERGED

No story-engine change is merged or built by this proposal. The separate
build repair is published as PR #1194 at
`e330c0682c86130bdd39c65e0e77c2f8dfda3bde`. Its exact-head CTO review request
is posted in the PR conversation. No Team 8 merge occurred.

This proposal starts from main
`54930d427555034f3a92f335064586247985784d` on
`codex/team-8-story-resolver-contract`. Source claims below are proposed,
pending coordinator reconciliation and Team 5's contract agreement.

## 1. Why-chain

SOURCE FINDING: a completed activity establishes immediate-aftermath presence
only through its completion event, participant membership, access, current
moment, and lack of a later location event. The existing reader enforces those
conditions in `src/presentation/scene-venues.ts:190`.

SOURCE FINDING: an active ordinary meeting requires actual arrival and an
entry event, with the player's direct knowledge. An invitation alone is
insufficient in `src/presentation/ordinary-meeting-scene.ts:16`.

SOURCE FINDING: a current opening scene reads saved participants and requires
an unresolved scene with a matching current moment. The chain bottoms out
in the existing recorded scene at `src/presentation/life-scene-flow.ts:247`.

SOURCE FINDING: a contextual binding names a situation but grants neither
agency nor presence. Its family room can construct a pair, so that pair must
not independently establish physical occupancy. The record's explicit
contract is in `src/simulation/scene-bindings.ts:16`.

SOURCE FINDING: the job reader derives shifts from employment records and
authored schedule patterns. Its activity query treats a scheduled interval
as whereabouts without requiring arrival. The chain bottoms out in an
authored presence assumption in
`src/simulation/living-world/work-schedules.ts:582`. Preserve that reader;
do not upgrade its output into new arrival evidence.

The missing piece is a common evidence-carrying projection, not another
producer, clock, scene schema, or presence writer. Existing-reader assumptions
remain visible to the developer and cannot silently acquire stronger meaning.

## 2. Research

No empirical size or new causal rate applies to this read-only contract.
Existing shift patterns are labeled game assumptions in their source; this
proposal does not call them researched presence rates. The accepted venue
contract states that a scheduled interval never establishes attendance.
See `docs/systems/scene-venues-and-travel.md`.

## 3. Revisions and contract to agree

The coordinator's latest split supersedes the earlier suggestion that Team 5
would write the resolver. Team 8 proposes the pure resolver; Team 5 owns
integration. All places use the same record matching. Place names, art keys,
and titles do not determine governmental authority or scene purpose.

### Entry point

Proposed signature, with local types in the new resolver module:

```ts
resolveStoryScene(world: World, request: StorySceneRequest): StorySceneResolution
```

The request contains the controlled viewer's person ID, a canonical place
reference, the explicit `SimulationMoment`, and selected addressee/audibility
when speech options are requested. It carries no invented participant list.
The World is the caller's existing snapshot; the function never substitutes
a new date or moment into it.

A place reference distinguishes an activity location, a household, and an
organization/workplace. It carries the relevant existing record ID and
jurisdiction/location key where that record supplies them. A broad workplace
picture category is not an exact building. Missing exact identity is retained
as incomplete coverage; a label cannot fill it.

Part 1 proposes current-moment resolution, because the activity, opening,
and contextual readers use the current snapshot. A different requested
moment returns an internal `unsupported-moment` result with no people or
options. Historical/future resolution is a separate extension using proper
as-of readers, not a silent rewind. Team 5 and the coordinator must agree on
this explicit part-1 limit before source implementation.

### Output and evidence

The result contains:

- The resolved canonical place and moment, with snapshot revision.
- Present people, each with source-reader identity, reason category, and
  typed references to existing records. Recorded entry/presence and existing
  modeled home context remain distinguishable.
- Expected workers or invitees separately, with their source basis. They do
  not receive speech options or knowledge merely because they are expected.
- Viewer-permitted facts and exact prior speech, with knowledge/public-access
  support. Private actor reasons belong only in developer evidence.
- Conversation opportunities and options from the existing speech readers,
  each carrying its subject, intent, addressee, audibility, source references,
  and revalidation snapshot. No executable callback closes over an old World.
- Internal coverage findings: unavailable identity, conflicting location,
  unsupported moment, missing record, or an unsupported scene use. These are
  developer diagnostics, not new player-facing copy.

Typed source references distinguish events, scheduled activities, household
membership, work relationships, knowledge, relationship interactions,
commitments, and law basis. A derived quiet-home key is a context key, never
a fabricated event ID. A starting-law key remains a starting-law basis,
never an invented enactment. Every reference must resolve in this World and
pass the relevant date/sequence cutoff.

### Source adapters and precedence

| Existing source                                   | Proposed use                                              | Boundary retained                                                |
| ------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------- |
| ordinary meeting entry/scene                      | current entered meeting, people, agenda, existing choices | invitation and arrival remain different                          |
| completedActivityHere                             | exact immediate aftermath and participating people        | completion expires at later movement or moment                   |
| currentOpeningLifeScene                           | current opened place and saved participants               | unresolved/current record is required                            |
| currentLifeTalkScene / play-scene context         | existing quiet-home context                               | household evidence is not carried into a recorded non-home place |
| peopleAtWorkAt / work relationships               | expected job occupants and reasons                        | assumed shifts never create an arrival event                     |
| activeSceneBinding / availablePlayerConversations | record-backed subject opportunities                       | binding/constructed room alone does not grant presence           |
| availableConversationIntents / listener resolver  | existing choices for present addressee and mode           | preserve hearing and settled-state checks                        |
| lawInForce for an option's actual proposition     | existing legal context/basis                              | do not copy or repair authority/preemption rules here            |

Latest canonical arrival/location and the exact active/completed activity
reader decide conflicts; the resolver does not rank people into a fictional
occasion. For multiple supported uses at one place, return all compatible
record-backed opportunities in deterministic record order. Do not choose a
field trip, signing, protest, or visit merely because the room could host it.

Relationship history can support an option involving someone already present.
It cannot move a friend or former officeholder into the room. A known topic
may make speech possible; missing topic evidence produces no such option.
A present person with nothing available remains present with an empty option
list. Absence of a legal answer is not permission or a prohibition.

Team 5 renders existing reviewed text and dispatches through existing writers.
Immediately before an action, it resolves the scene again against the current
World and revalidates subject, intent, person, and hearing. Saved IDs and old
history remain intact. A source revision mismatch never commits an old offer.

## 4. Numbered parts and exact ownership

1. Agree on the current-moment limit, exact place identity, and the separate
   expected-versus-present lists in this proposal.
2. Team 8: new `src/presentation/story-scene-resolver.ts` and
   `src/presentation/story-scene-resolver.test.ts`, plus its own release note
   and handback. The module is pure TypeScript with no React, DOM, network,
   simulation advancement, writer calls, or new records.
3. Team 5: new `src/player/StoryScenePanel.tsx` and its test if needed, and
   only centrally released player mount hunks. This proposal grants no extra
   PlayerGame hunk beyond the existing release.
4. If extracting an existing pure reader is required, name the exact hunk
   and owner first. Existing presence readers, scene producers, scene
   bindings, conversation writers, shared types, and art renderers are
   excluded from Team 8's proposed source claim.
5. Record-derived new options and continuity belong to later numbered parts.
   Existing supported options can be projected now. Do not manufacture a
   favor, lie, endorsement, speech, or event to fill an empty list.

Only this proposal and its development-only release declaration are written
on this branch. The coordinator owns central claims; no overlapping source
edit has started.

## 5. Simulated, records, world pieces, checks

SIMULATED: none new. The resolver reads decisions; it does not make them.
RECORDS: existing presence, activity, speech, knowledge, relationship, and
commitment IDs are retained. No derived read is persisted as history.
WORLD PIECES: active meeting, completed activity, opened scene, employment,
household, and contextual readers exist. Exact universal building identity
and arrivals for every job/occasion are not established by this inspection.
Missing producers remain explicit gaps rather than authored events.
CHECKS: source inspection and live branch verification only for this proposal.
No runtime contract test, browser integration, or random-place proof has run.

Required focused tests after contract agreement:

- Reading returns identical output and leaves serialized World unchanged.
- Future invitations, canceled meetings, stale completion, later movement,
  dead people, and contextual-only bindings do not create present actors.
- Same venue category in two jurisdictions does not combine their people.
- Job schedule assumptions remain expected occupants; an actual entered
  meeting retains its exact roster and evidence.
- Unknown place or unsupported moment returns no invented person or option.
- Every present-person/option reference resolves, with no future or private
  knowledge leak; truth and deliberate lies keep their recorded basis.
- Hearing, selected addressee, settled state, and revision changes preserve
  existing availability and commit revalidation.
- A no-art case preserves record-backed presence; pixels never grant speech.

Use existing indexed readers or bounded source rows. Do not scan every person
or all history for each candidate. The resolver runs when the scene is read
or its snapshot changes, not as a new daily world pass. Measure cold and warm
reads against the same preserved snapshot after implementation.

## 6. Proof run

NOT RUN for this proposal. The predecessor's preserved Orange City worlds
remain absent from this replacement workspace; no new life was created.
After agreement, use an existing portable world if available and record its
seed/place, before/after hash, roster, source IDs, options, and missing cases.
The saved packet must be a real World, not a claim that fixtures are play.

## 7. Worked example and next bounded step

No named simulated example is claimed yet. A recorded meeting entry should
return the exact chair and residents from that entry, its activity and arrival
basis, and only its existing comment choices. Its invitation should remain
context until entry. That is the first proposed implementation example,
pending a real preserved world and contract agreement.

Next independent work: finish the contextual answer-key traces while the
coordinator and Team 5 reconcile this contract. Build-repair review is already
requested separately. Story-engine implementation starts after the explicit
shared boundary is accepted; no new team or helper is requested.

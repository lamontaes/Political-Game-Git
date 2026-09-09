# ENV-ALL1 progress

Owner: ENV-ALL1 (environment/place). Branch `claude/env-all1-existing-environments`,
worktree `/Users/lamontae/Documents/Political-Game-ENV-ALL1`, base `origin/main` 1eb0b0d.

## Established (read, not re-derived)

- Registry/spec architecture is sound: `EnvironmentSceneSpec` -> `scene-registry.ts` ->
  `SceneBackdrop`. Adding a room is authoring a spec.
- `resolveLifeScene(world, personId)` is ALREADY called by `PlayerGame.tsx:1443` and painted
  by `SceneBackdrop` at 1557. The domestic seam is CLOSED on main.
  => `scene-consumers.ts` is STALE for ordinary-domestic-life / household-conversation /
  formative-years (still claims `wiredThrough: null`, "blocked-by-owning-lane").
  => Extending `resolveLifeScene` wires new rooms into normal play WITHOUT touching
  PlayerGame.tsx/App.tsx (UI-CORE-RELEASE's exclusive files).
- Canonical committee hearings and floor votes DO exist (`scheduleCommitteeHearing`,
  `COMMITTEE_HEARING_TRANSITION_KEY`, `takeFloorVote`). scene-consumers' "no canonical
  committee proceeding exists" is stale too.
- Canonical venue seam found: `ScheduledActivityRecord.location.locationKey`
  (`AuthoredActivityLocation`), with `canPersonAccess` + `scheduledActivityPerformanceTiming`
  - `kind: "travel"` already carrying access / duration / commitment truth.
    Live keys: `ordinary-life:meeting-room`, `campaign-call-desk|doors|office`,
    `lexington-legislative-office`, `east-end-community-room`, `office-to-east-end` (travel),
    `private-field-call`, `executive-office`.
- `ENVIRONMENT_MASTER_MINIMUM_WIDTH = 4608` (src/presentation/component-masters.ts).
- `art/qa/p76/reference_measurements.json` holds deterministic image-space measurement cards
  for all 9 scene masters INCLUDING the courtroom. This is the valid image-space authoring
  evidence; every field carries its own confidence.

## Bank census

Released plates (7): council-staff-office(fixture), shared-workroom-office,
civic-community-meeting title, apartment canonical_03, apartment ordinary_02,
civic-hearing-room, legislative-chamber. Plus 1 foreground mask.

Approved masters, unreleased (3):

- courtroom_empty 5504x3072 -> CLEARS the 4608 minimum. Carryable. THE one approved
  environment master that can still be brought through the pipeline.
- executive_private_office 1672x941 -> BLOCKED below minimum.
- apartment_living_starter_01 1376x768 -> BLOCKED below minimum.

#131 candidate intake (rights unknown, owner acceptance NOT given, floor plane NOT
calibrated -> preview only, never ordinary play):

- env_park_community_pavilion (IMG_5204) - EXTERIOR; no outdoor family exists.
- env_press_briefing_room (IMG_5202) - explicitly NOT a hearing room.
  Unprocessed drive-sweep environment candidates: IMG_5189 (executive office, 5504 -
  answers open request env-executive-office-4k-master), IMG_5190 + IMG_5207 (field office,
  answers env-campaign-storefront), IMG_5205.
  IMG_5183 = exact duplicate of the chamber master; not a room.
  Reference-only environment corpus: 145. Duplicates: 32. Not playable rooms.
  Prop banks art/shared/{flags,furniture,lecterns,av_press,seals_emblems,lighting,
  doors_windows_rails,documents_desk_props} are ALL EMPTY (.gitkeep only). Exact gap.
  `supplies.png` prop sheet: accepted chopper cannot safely item-chop it (#95 finding).

## Plan

A. environment-sources.ts + test - derived source-to-scene disposition ledger.
B. Courtroom carried through: tiers -> family -> spec -> registry -> manifest.
C. scene-venues.ts - canonical locationKey -> scene adapter; resolveLifeScene extension
honouring access, travel (travel is NOT arrival), and no-time-advance-on-read.
D. scene-consumers.ts refreshed against what is actually wired now.
E. ?view=scene-gallery extended into the one navigable review.
F. Integration patch note for UI-core only if a shared file genuinely needs it.

## State

- [x] worktree + branch
- [ ] A [ ] B [ ] C [ ] D [ ] E [ ] F

## Codex transfer checkpoint — 2026-09-09

Exclusive recipient: task `01a083ce-ee0a-72f2-befc-5f2c88319cbb`.
Recipient `/private/tmp/pg-env-all1-transfer`, branch `codex/env-all1-transfer`.
Source above preserved read-only; its actual common Git directory is
`/Users/lamontae/Documents/Political-Game-Claude-Modular/.git` (a separate
checkout from the Codex project's Git directory). Source HEAD and fresh
origin/main are both `1eb0b0d09be40e3e10bedd2a1d9fa301eae47f4b`.
The baseline checkout has the same HEAD and no implementation delta.

Recovery storage: `/private/tmp/pg-env-all1-recovery`: binary-capable tracked
patch, all 14 selected untracked files, SHA-256 manifest, original test/server
logs. 27 files total, 8,494,042 bytes; no untracked source files excluded.
`.claude/launch.json` is preserved in the recovery patch but not replayed because
it is the old server configuration. Every captured file and patch was checked
again against the stable source. Only source-associated processes were orphaned
Vite PID 33731 and npm parent 33634, port 5216; no associated validation/writer
was found. They were left untouched. Recipient preflight passed.

Initial recovered tests: 3 files / 45 tests pass, single worker. This does not
validate the recovered behavior: its positive venue tests directly replace
currentMoment, and the resolver mistakes a scheduled interval for attendance.
Repair this before normal-player evidence. The original full-suite log reports
16 failed files / 68 failures / 973 passes, with many timeouts; it is not a green
checkpoint and no new full gate is claimed.

Ownership exchange: UI-core owns shared manifest integration and roots; PEOPLE
owns body/garment compatibility; MUNI is providing completed attendance and exact
venue kind. Requests sent to JUD/LEG for their exact activity consumers.
No art release, new generation, self-merge or second ownership lane.

Remaining: repair actual performed activity/presence selection; confirm source
and geometry authority; connect supported feature consumers and travel/provider
seams; real pointer/keyboard normal-route evidence; final gates and draft PR.

### Travel ownership recovered from the existing OPENING owner

OPENING-LIFE1 held a provisional `walkOpeningNeighborhood` in
`/private/tmp/pg-opening-life1/src/presentation/life-scene-flow.ts`. Owner froze
that function and confirmed its five minutes are authored scenario duration,
not measured geography. Its existing household/guardian eligibility remains
OPENING-owned. ENV supplied `place-travel.ts`, a versioned provider boundary
composing existing scheduled travel, completion and `life.scene.arrived` history.
It refuses missing routes, invalid durations, stale origins and conflicts;
rechecks provider eligibility after time passes; never derives a county/government
relationship or scene from a place label. Four focused tests pass. The actual
OPENING adapter integration/frozen commit is pending from its owner.

`resolveLifeScene` now respects existing arrival/opened context: an unsupported
non-home setting is not replaced with home art. This remains separate from the
immediate performed-activity aftermath. No persistent place store or second clock
was added.

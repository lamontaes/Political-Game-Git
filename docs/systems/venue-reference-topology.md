# Scene references and venue topology

Section A adds a headless reference catalog under `src/environment/reference/`.
It describes researched physical places and dated institutional uses. It does
not initialize or mutate World, assign an office to a person, grant access,
advance time, select released art, or integrate with the player scene renderer.

## Authority and provenance

Base: `8733190609c5620c40ed424686d43fb72fb78d0c`.
Execution authority: [current implementation prompts, Section A](https://drive.google.com/file/d/1mnN8JXMsenaDMOXBr59FIqJlYGW5fpSlK1kOsNGm8Qo/view).
Research consumed:

- [18J measured geometry](https://drive.google.com/file/d/1k9pGztz1qwp75Aqj1C2so1Pw0oEzQhqJ/view), dated 2026-09-02.
- [43A environment backbone](https://docs.google.com/document/d/1cpmq9z2Dje-CeomODu8u02pqyjiyTnyruWdtYXU6S98/edit), including its newer corrections and subsequent state/federal tranches through 2026-08-25.
- [Current assignment board](https://docs.google.com/document/d/1s0YTUaYcWpOi_MqbaXNW71-nhYrVTTd57AnNPa8pv0E/edit), for ownership boundaries.

`evidence.json` preserves bounded research excerpts, section locators and the
primary URLs actually cited by those excerpts. `citedSourceIds` links those
primary references to the research claim. An excerpt is `research-transcribed`;
its cited primary source is `cited-not-acquired`. Source dates describe the
research document, not invented primary publication dates. Rights remain unknown.
No raw artifact hashes or source-substrate acquisition records are manufactured.

18J's ten selected matrix rows retain the stated `exact` class and numeric
values, including ranges. Their primary citations are truncated in the consumed
text, and identified drawing sheets/calibration were not supplied. These claims
are explicitly unresolved and render-blocking. This preserves evidence cargo
without presenting it as independently verified measured geometry. Section 3's
generalized presets lack a per-number evidence class; they are not silently
converted into exact room measurements. Section 4's illustrative screen
coordinates do not override the accepted scene/camera geometry.

## Identity, dates and use

`CampusReference`, `BuildingReference`, `RoomReference` and `VenueReference`
represent physical identity. `SceneReference` separately binds an institution,
branch, role and activity to a venue. A building-family reference has a null
room ID: resolving it does not invent a private office, room number or occupant.
The six federal office buildings each retain their own asset and geometry family.
These family keys are reference identities, not entries in the released art bank.
Jurisdiction/government/institution keys are reference linkage keys, not World
entity IDs or asserted Census government IDs. A later adapter must supply an
explicit canonical crosswalk; no name-based join exists here.

Each use and availability era has two date concepts:

- `effective.start/end`: inclusive actual boundaries, null when unestablished.
- `observedDuring.start/end`: inclusive bounded coverage of the consumed research.

Both must match a query. Null effective boundaries never authorize extrapolation
outside the evidence window. The authored 2026 coverage window represents the
research's selected-year configuration, not a January 1 opening or December 31
closure. A known projected return year is not a reopening event. Old records are
not rewritten into a future configuration; later evidence adds a dated era.
Meeting-specific records require the explicit meeting ID and date. They never
become institutional defaults just because a committee used that room once.

`resolveVenueReferences` returns all matching candidates in stable ID order,
including unavailable and unknown candidates with reasons. It does not choose a
winner between several valid office buildings or infer a floor sitting on every
day of a session-year reference. `temporary` and `swing_space` describe potentially
usable replacement venues; `construction`/closed records are unavailable.
Ceremonial-only and historic-only uses cannot become working-office candidates.
Public/security metadata does not grant entry: actor access remains with the
existing canonical access consumer.

`classifyVenueTopology` returns same-room, same-building,
same-campus-different-building, off-campus or unknown. Null room identity does
not become same-room; null campus identity does not become off-campus.
There are no travel minutes, speeds, route lengths, costs or new time system.

## Geometry and exact-render gate

A geometry record is a scalar, range or explicit unknown. Numeric evidence
retains `exact | plan-derived | specified | bounded-estimate | visual-estimate`.
The existing scene-spec confidence type is reused through a type-only import;
no #103-owned file is changed. Unknown values carry a reason and no numeric or
confidence fields. Diameter is not converted into invented rectangular dimensions.
A single unassigned dais column remains building-context evidence rather than
being copied onto both chambers. Nebraska's generic House/Senate matrix labels
are not evidence for two current institutional bodies; ambiguous measurements
remain unassigned and blocked.

Exact-render reference readiness fails closed for unavailable/unknown venues,
unestablished specific rooms, incomplete room envelopes, unknown measurements,
non-exact classes, missing primary geometry evidence, incomplete visual packs,
explicit render blockers, stale superseded claims, and unresolved controlling
location/geometry discrepancies (even if a caller mistakenly clears the boolean).
It reads attached campus/building/room/venue/use/era/geometry claims; an unrelated
room's disputed claim cannot block another venue. All production records in this
initial corpus remain blocked for exact rendering. This is an intentional evidence
limit, not a completed exact-render capability. A reference-ready result would
still require the existing art authoring, calibration, manifest and release gates.

## Bounded first corpus

The concrete room/building assertions below are transcriptions of the linked
43A authority, with 18J measurements linked separately at claim level.

| Jurisdiction     | Encoded contrasts                                                                                                                                                                             |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kentucky         | Closed historic chambers; separate temporary House/Senate rooms; Annex office/hearing/public livestream families; relocated 501 High Street executive family; bounded pre-closure chamber era |
| Virginia         | Patrick Henry refreshed executive family; historic Capitol chambers/Old Governor's Office; General Assembly office/hearing family; separate Mansion residence/ceremony uses                   |
| Tennessee        | Historic chambers and clerk-support family; Cordell Hull office family and House Hearing Room II                                                                                              |
| California       | Historic chamber identities; 1021 O Street swing office family and Governor Suite 9000; no universal member assignment                                                                        |
| Minnesota        | Capitol rooms; closed State Office Building; Centennial temporary House offices; Senate Building office/hearing family and screening metadata                                                 |
| Texas            | Historic Capitol/underground Extension offices; reception 2S.1, press 2S.2 and business/legislative-division 1S.1; current governor room remains unassigned                                   |
| New York         | Separate Assembly/Senate architectural identities; LOB and Capitol office candidates; Red Room; separate Mansion residence                                                                    |
| North Dakota     | Named rooms, including Peace Garden and Brynhild Haugland, alongside separate chamber identities and finishes                                                                                 |
| Nebraska         | Unicameral building-level chamber reference; Governor Suite hearing/reception rooms; unresolved chamber measurement mapping                                                                   |
| New Mexico       | Roundhouse chambers and circular geometry; room 307/317 meeting-specific 2025 schedule exemplars, not assumed 2026 occupants                                                                  |
| Federal Congress | Cannon, Longworth, Rayburn, Russell, Dirksen and Hart working-office families with distinct architectural lineage; no invented contemporary suite assignment                                  |

Research still available but not encoded: the other 40 states' 18J rows; its
unspecified-confidence generic presets; remaining 43A state/municipal tranches;
the separate 45 municipal continuation (not consumed because this lane does not
seed municipal claims); federal district offices and further hearing rooms;
individual office assignments; exact private-room and temporary-room geometry;
room-level photographic extraction; primary drawing identification/calibration;
actual relocation/reopening boundaries not established by the research.

Personalization is a downstream composition seam. Base references may describe
permanent architectural features/furnishings; an eventual artifact-slot consumer
must receive occupant/local/history objects from canonical history separately.
There is no personal-clutter generator and no mutation of the base venue identity.

## Architecture integrity audit and LEARN

| Concern                                      | Disposition                       | Evidence                                                                                                                                                                    |
| -------------------------------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frozen simulation and current #103 ownership | Confirmed compatible              | Only additive reference files and lane documentation; no scene, presentation, player, CSS, art manifest or World changes                                                    |
| Source substrate and D-074                   | Confirmed compatible              | Research transcriptions with explicit acquisition limits; no import from `src/source`, no invented RawArtifact/NormalizedCorpus, no World adapter                           |
| Existing measured-geometry authoring         | Confirmed compatible              | Retains the scene confidence vocabulary; no scale derivation or projection into authoring evidence; future adapter must meet the existing reproduction-calibration contract |
| Open content taxonomy                        | Confirmed compatible              | Dotted validated content keys; jurisdiction/role/building examples do not become engine enums                                                                               |
| Identity and history                         | Confirmed compatible              | Room distinct from institutional body; immutable imported catalog; inclusive dated records and bounded evidence windows                                                     |
| Precision and discrepancies                  | Contained correction              | 18J's incomplete citations and Nebraska column ambiguity are explicit blockers; generic presets/screen coordinates are not promoted                                         |
| Existing runtime integration                 | Deferred through named dependency | After this lane and #103 stabilize, a separately authorized consumer may bind canonical World location/meeting IDs to these references and released art                     |
| Travel, permission and personalization       | Confirmed absent                  | Resolver supplies reference candidates/topology only; no cost, access grant, artifact generator or new mutable engine                                                       |
| Acceptance                                   | Pending independent review        | Headless behavior is testable here; no player-facing visual acceptance is claimed                                                                                           |

LEARN: an evidence class describes how a measurement was reported, while
primary-evidence availability describes whether it can support an exact replica.
The schema and regression tests enforce those as separate axes. Effective dates
and evidence coverage likewise remain separate to prevent a research date from
becoming a fabricated opening/reopening date. Strict admission rejects unknown
fields, including invented travel costs, rather than leaving this as a prompt rule.

## Verification

Focused coverage lives in `src/environment/reference/reference.test.ts`; run it
with `npx vitest run src/environment/reference/reference.test.ts`. The owning
completed plan records exact commands and results from full repository validation.
No browser interaction changes occur in this lane.

# Player Presentation and Epistemic Projection

Status: **Stage 6.5 Run A implementation contract**

## Boundary

Run A adds the first normal player-facing surface without changing accepted
Stage 6 simulation semantics or snapshot versions.

- `src/player/` owns React components, focus behavior, and responsive visual
  composition.
- `src/presentation/` owns deterministic fixture composition, player-visible
  selectors, inspectorial UI state, learned-concept persistence, and semantic
  scene-placement validation. Its selectors and reducers run without React.
- `src/simulation/` remains authoritative for canonical people, events,
  relationships, political records, date, action sequence, and history.
- `src/ui/` retains the explicitly diagnostic viewer at `?view=developer`.

Run A presentation state never enters `World`, JSON snapshots, or SQLite. The
strict world/snapshot version rejection contract remains unchanged.

## Epistemic projection

The quick dossier is a bounded projection, not a general dump of Person or
HistoryStore. Every visible field carries one qualitative access class:

- personally known;
- institutionally accessible;
- publicly discoverable;
- reported;
- inferred and uncertain;
- unknown.

These classes are labels, not meters. A fact is omitted or shown as unknown
when the fixture does not justify access. The Run A canonical person has an
authored private belief whose rationale is deliberately excluded from the
dossier and browser DOM. Public speech remains distinct from that private
belief. A qualitative relationship read derives from explicit shared history
and remains distinct from a numeric score or hidden trait.

Place labels follow the same boundary. The fixture dossier names an accessible
birthplace fact as `Birthplace`; if that fact is unavailable, it may name an
accessible residence fact as `Residence`. A person's `homeJurisdictionId` alone
never supplies or implies a hometown, and the selector returns an unknown
`Hometown` when neither kind of evidence is available.

## Inspectorial state and time

The Run A reducer stores selected person, one contextual overlay, navigation
depth, automatic and manual pin sizes, and learned concept IDs. It snapshots
the simulation date and action sequence only to prove they remain unchanged.
It neither accepts nor returns a `World` transition.

Clicking a person, choosing Inspect, closing or reading a dossier, opening
navigation, selecting a pin size, opening civic help, and marking a concept
learned are inspectorial actions. They append no history and advance no time.
The contextual menu and dossier are mutually exclusive states; Inspect replaces
the menu rather than layering over it.

Manual pin size is authoritative over later automatic importance sizing for
the active session. Pin size is intentionally not save state in Run A.

## Civic learning persistence

The one bounded Run A concept is `committee-referral`. Opening its explanation
does not mark it learned. The explicit button and Shift + left click do. A
keyboard user can activate the same semantic controls. The learned concept is
stored in a versioned, allowlisted browser-storage record under
`political-game:run-a:learned-concepts:v1`; malformed or unknown content is
ignored. This presentation-only record is not a simulation save or migration.
After learning, the resting scene marker disappears while the reference remains
available from primary navigation. Opening the reference also closes the
temporary navigation surface so the two overlays do not compete.

## Deterministic fixture and layout

The seed `stage-6-5-run-a` composes one synthetic office event and relationship
interaction through accepted simulation writers. The presentation-only job
title, scene role, office clock, and office geometry do not claim a Stage 7
institution or jurisdiction rule.

Named URL fixtures reproduce normal, person-menu, dossier, civic-learning,
mixed-pins, navigation, and submenu states. The scene layout separately records
a scene-placement anchor and a compatible character pose/configuration alongside
the desk, chair, and seated-person footprints and lower-body desk occlusion.
Validation rejects incompatible pose metadata, floating/scale failures, a
seated body outside its chair footprint, or a declared physical intersection
with the desk. These semantic rectangles safeguard deterministic fixture data;
they do not prove the actual CSS-rendered character/furniture geometry. Codex's
implementation-time browser inspection is also distinct from the independent
human visual acceptance still required on the unmerged PR.

## Visual-reference provenance

The following files were supplied directly by the project owner on 2026-08-26
as visual/composition authority. They are not committed assets and their rights
status remains **unknown**.

| Reference                                                                     | Authorized use in Run A                                                          | Rights  | Measurement confidence |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------- | ---------------------- |
| `STYLE_REFERENCE_APPROVED_Render_A.png`                                       | Warm semi-illustrated office, scene-first hierarchy, navy/gold shell             | unknown | visual-estimate only   |
| `LOCKED_UI_bottom_left_reference.png`                                         | Compact bottom-left seal/time/date/location plaque and restrained civic linework | unknown | visual-estimate only   |
| `LOCKED_UI_pin_tray_reference.png`                                            | Narrow right tray, small resting pins, one emphasized current pin                | unknown | visual-estimate only   |
| `GEMINI_OUTPUT_19_PROMPT22_ACCEPTED_two_character_office_depth_occlusion.jpg` | Character scale, desk depth, seated-body occlusion, and furniture separation     | unknown | visual-estimate only   |

Run A uses repository-authored React, CSS, and ordinary text for the scene
fixture and all dynamic shell content. The references do not authorize copying
their raster UI, microtext, flags, seals, implied jurisdiction facts, or exact
dimensions.

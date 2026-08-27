# Player Presentation and Epistemic Projection

Status: **Stage 6.5 Runs A–C implementation contract**

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

The player-facing **Your Read** panel is a bounded subjective projection, not a
general dump of Person or HistoryStore. Every visible field carries one
qualitative access class:

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

## Run B conversation boundary

Run B adds a React-independent bounded conversation adapter and a separate
conversation presentation reducer. `PlayerOffice` now owns the current
immutable `World` for the player session and replaces it only with a successful
committed-turn result. The Run A reducer remains inspectorial. Conversation UI
state may retain session identity, current addressee, audibility, displayed
dialogue, local committed-turn count, paged history content, collapse state,
and one fixture-specific progression record: current subject/phase, Collins
support condition, Reed verification promise, latest proposition, pending NPC
contributions, settled silence, and the bounded subject facts that ground the
fixture: constituent-services referrals, the county program, the missing
proof-of-income form, the unresolved third referral, and the proposed staff
checklist. It never copies canonical beliefs, claims, knowledge, perceptions,
relationship history, or decision traces.

Opening or closing conversation, changing NPC A/NPC B/Everyone addressee,
changing Normal/Quiet/Private audibility, opening or closing the transcript, and
collapsing or resuming the strip are presentation actions. They write no World
record and change neither date nor action sequence. One substantive turn uses a
stable session key built from World, scene, starting history frontier, and
participants plus a local positive turn ordinal. An already committed key is
rejected before any new write.

The primary deterministic fixture has a physically situated controlled person,
Andre Collins at the accepted desk anchor, and Julian Reed at a separate
visual-estimate guest-chair anchor. All three are physically present and active
participants; only the two NPCs are addressees. Normal includes both NPCs as
reasonable listeners, Quiet normally limits hearing to the selected addressee,
and Private is unavailable while the other NPC is plausibly within earshot. A
second deterministic two-person room context makes Private genuinely
available. This explicit bounded data is not a distance, decibel, ray, cone, or
universal room simulation.

Hearing-dependent pending response eligibility uses that same current resolved
listener set. If Quiet-to-Reed excludes Collins, a Collins contribution remains
queued but cannot produce dialogue, event participation, claim knowledge, or
other hearing-derived consequences. Because that contribution still exists,
Listen is unavailable rather than generating repeat empty turns. Changing the
same state to Normal includes Collins, makes the response eligible, and consumes
the contribution exactly once.

For a substantive turn, the adapter validates World/session/room integrity;
evaluates only a genuine NPC semantic decision when required; immediately
records any durable trace; resolves actual listeners; and then composes the
accepted event, claim, direct/told-by knowledge, heard-claim perception, and
qualitative relationship writers. Spoken claims default to unknown truth
relationship and never silently become private belief, public position, or
campaign commitment. A listener may receive direct knowledge of presence and a
separate claim-linked told-by record without an invented `overheard` source.

All records use `World.currentDate`. Same-day order is the global history
sequence; `World.actionSequence` remains unchanged. Deterministic authored
phrase families translate the semantic response into natural dialogue without
exposing decision ranks, scores, source snapshots, hidden beliefs, stable IDs,
or diagnostic fields. Selection uses the concrete emergency-rent referral,
addressee/group context, intent, preceding session turn, and NPC outcome. The
compact header and opening exchange identify `You — Cameron Foster`, the three
Lexington tenants who sought this office's help, the missing proof-of-income
form that stopped two county referrals, Reed's check of the third referral, and
Collins's decision about a document checklist before future referrals.
Addressee switching projects a continuation from the progression record
instead of replaying an opening line. Listen consumes actual
and currently audible pending NPC contributions, may then settle the room once, and remains
unavailable until a later player action creates another legitimate follow-up.
The active box has no internal vertical scrollbar at the desktop acceptance
viewport. History reuses the same box and pages one turn at a time. The compact lower strip keeps both people, the room,
bottom-left navigation, and right pins recognizable and usable. Run B adds no
runtime LLM/network dependency, sub-day clock, legislation/calendar workspace,
universal dialogue engine, or Stage 7 institution/law content.

The accepted right-side rail projects one deduplicated person pin for each
scene NPC in deterministic order. Pin activation opens a small floating menu
with Compact, Standard, Expanded, and, for person pins, Unpin. Removing a person
leaves briefing and unrelated pins intact, clears that pin's stale manual size,
and permits a clean re-pin. Manual size continues to outrank later automatic
sizing. Pin, unpin, and size actions remain inspectorial. Navigation, pin, and
person-action menus dismiss on click-away or Escape; dossier and conversation
surfaces do not silently close as a side effect of that transient-menu rule.

## Run C working-document boundary

Run C composes the accepted office and immutable `PlayerOffice` World owner with
one deterministic Transit Access Pilot office working draft. The ordinary entry
is a physical paper on the scene desk. Focusing it preserves visible room edges,
the right pin rail, and the bottom-left shell while providing natural document
scrolling. Legal text remains authored, deterministic, selectable DOM text; no
legal wording is baked into art.

Document, provision, variant, selection, and annotation identities are stable
presentation records. The shared Section 3 amount selection remains one stable
identity across the current $8,000,000 and prepared $4,000,000 variants. Each
variant's Section 3 record explicitly stores its Stage 6 policy alternative and
operation IDs plus the Lexington `transit.pilot-eligible-riders` metric scope.
The UI never parses currency text to infer the operation.

Current legal text, staff annotation, Collins's interpretation, prepared
alternate text, and compare markup remain separate. Annotation visibility,
clean-document mode, phrase selection, compare open/close, focus, and panel
state live in `runCDocumentUiReducer` and cannot write World. The qualified
staff comparison is projected only when Cameron owns ordinary policy-analysis
review knowledge for each estimate. A canonical hidden sensitivity estimate is
not included in labels, descriptions, annotations, compare, accessibility text,
or DOM.

The selected phrase can open the existing conversation strip with one
`transit-access-pilot-provision` progress variant and a Run C room key. Collins
is the sole eligible addressee while Reed remains physically present and a
Normal-mode listener. Collins's authored response requires Collins's own
knowledge of the current estimate. The shared Run B commit path supplies actual
listeners, ordinary event, unknown-truth claim, direct/told-by knowledge, and
heard-claim perception; it never falls back to the emergency-rent casework
subject.

The only drafting consequence is one exact
`office.working-draft-revised` event selecting the prepared $4,000,000 office
version. `projectRunCWorkingDocument` derives the active variant from that exact
event and verifies its alternative/operation linkage. Duplicate submission
rejects. The action keeps date and action sequence unchanged and creates no
policy realization, effect activation, metric state, bill, law, appropriation,
office authority, chamber procedure, calendar, or sub-day clock. Run C working
document state is not enacted law and does not replace the future law,
institution, legislation, appropriations, or procedure model.

### Run C human-play acceptance correction

The exact legal phrase uses underline, restrained background, hover/selected
state, and normal focus outline without generated pseudo-text inside or above
the sentence. Document-open mode applies a modifier only to the existing
bottom-left navigation cluster, reducing it to a small time/date/location chip
that does not intersect the paper at the normal desktop viewport. Closing the
document restores the accepted Run A shell without changing its ordinary
markup, information, or behavior.

Current/prepared language is projection state, not variant identity. Before the
revision event, the $8,000,000 variant projects as current and the $4,000,000
variant as the prepared narrower revision. After the exact
`office.working-draft-revised` event, the $4,000,000 variant projects as current,
the $8,000,000 variant as the earlier office version, and no prepared variant
remains pending. Paper status, annotation summary, analysis roles, compare
semantics, action names, accessible labels, and DOM text consume that derived
role projection.

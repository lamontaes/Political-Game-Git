# Scene Authoring Pipeline

How an approved picture of a room becomes production scene cargo.

`scene-and-person-presentation.md` describes the runtime contract — what a
registered scene is and how the compositor places people in it. This document
describes everything upstream of that: how a candidate master gets accepted, how
its raster ladder is derived, how the scene's geometry gets authored, and how
the art's physical identity is kept separate from what the World calls it.

The whole pipeline exists to remove hand-built React and CSS from the act of
adding a room. Adding a room should be authoring data.

## The refusals

Four things this pipeline will not do, each because the alternative fails
silently and expensively later:

1. **It will not enlarge a raster.** A requested tier above the master is
   skipped and the ladder is shorter. A 4096 file that carries 2048 pixels of
   detail is a promise the runtime cannot keep.
2. **It will not launder lineage.** An externally upscaled master is admissible,
   and often it is the best art available — but the enlargement is declared, and
   the declaration follows every tier derived from it into the manifest, the
   registry and the fidelity warnings.
3. **It will not guess geometry.** A scaffold's floor lines, seat planes and
   contacts start UNRESOLVED and stay that way until someone settles them.
   Projection to a scene spec refuses while a blocking gap remains.
4. **It will not read meaning out of a filename.** Lineage, access class and
   world label are all declared by a caller. Nothing is inferred from a path.

## The eight systems

| System | Module                                | What it owns                                                                 |
| ------ | ------------------------------------- | ---------------------------------------------------------------------------- |
| 1      | `src/authoring/asset-lineage.ts`      | What a candidate must declare before it is production cargo                  |
| 2      | `src/authoring/tier-plan.ts`          | Which rasters of the ladder may honestly be derived                          |
| 3      | `src/authoring/scene-scaffold.ts`     | A structured, exhaustively-incomplete place to author geometry               |
| 4      | `src/authoring/measured-geometry.ts`  | Provenance-backed measurements of real rooms, as an authoring aid            |
| 5      | `src/authoring/semantic-context.ts`   | Physical scene family versus canonical world label                           |
| 6      | `src/authoring/dynamic-surfaces.ts`   | Baked decor versus information the simulation owns                           |
| 7      | `src/authoring/asset-bank.ts`         | The batch QA schema an external reviewer fills in                            |
| 8      | `src/authoring/dynamic-components.ts` | Which component families a dynamic surface may host, and the legibility gate |
| 9      | `src/authoring/civic-symbols.ts`      | Flags, seals and arms as identities with citations and usage rules           |
| 10     | `src/authoring/generation-queue.ts`   | Which modular-person parts are missing, and which only look it               |
| 11     | `src/authoring/external-packs.ts`     | What a downloaded third-party pack is, legally and technically               |
| 12     | `src/ui/SceneAuthoringProofView.tsx`  | The development overlay that reads coordinates off a plate                   |

Everything under `src/authoring/` is pure: no filesystem, no DOM, no network.
The filesystem half lives in `scripts/art-asset-factory/`.

## Source lineage

Every candidate declares one lineage class:

- `original-master` — the generated or authored render itself.
- `external-upscale-derivative` — enlarged or retouched outside this repository.
  Must name its parent and declare `nativeDetailWidth`.
- `production-normalized` — a deterministic in-repository normalization. Never
  enlarges, so detail is preserved exactly.
- `runtime-tier` — a member of a derived ladder.
- `reference-only` — evidence and authoring reference; never shipped as a plate.

…and one native-detail state: `native`, `declared-upscale`, or `unverified`.

`unverified` is a real answer, not a failure. It is what an approver honestly
says about a file whose history nobody knows, and every tier derived from such a
master reports unverified detail rather than claiming its pixel width.

## The raster ladder

The standard environment ladder is 1024 / 2048 / 3072 / 4096. A master fills the
tiers it can and skips the rest. When the master is narrower than the widest
requested tier but wider than the next one down, its own width joins the ladder
as a `native-master` tier — otherwise real detail would be discarded purely for
landing on an unround number.

`RasterTierDerivation` carries four values. `external-upscale-derivative` is the
one this pipeline added: real pixels, admissible in production, but detail that
stops at a declared `nativeDetailWidth`. It is distinct from
`upscaled-development-fixture`, which is an enlargement this repository performed
and which may never reach a production plate.

## Physical family versus world label

A picture of a modest apartment is a picture of a modest apartment. Whether it is
the player's home, their parents' home or a friend's home is a fact about the
World.

`PhysicalSceneFamily` describes the room. `SceneSemanticBinding` records what the
World is currently calling it, and the label is always supplied by the caller
from canonical truth — never derived from a filename, a family id or an access
class. One apartment plate serves four homes across a political life; one
pavilion serves a childhood birthday and a campaign meet-and-greet.

Access class describes the KIND of gate a place has. It never grants passage:
`evaluateSceneAccess` reads roles from the canonical context, and a family's
`roleEligibilityTags` are a search key for future progression work rather than a
permission.

**This contract is not wired into PlayerGame.** It is types, validation and
fixtures. Integration is a separate decision.

## Lived-in, not legible

A room should look like somewhere people work: art on the walls, books that
lean, a plant, a few coloured papers, a clock-shaped thing near the door. None of
it should be readable.

Anything the simulation owns — a jurisdiction name or seal, a campaign name, a
bill number, a headline, an agenda, an election result, a date, a map label, an
officeholder portrait, a briefing slide — belongs in a declared surface slot.
Baked readable text is a validation error: it is either wrong, or it is asserting
something the simulation never decided, and it is frozen either way.

## Measured geometry

Optional, provenance-backed measurements of real rooms, as an authoring aid.

A number a source stated is `direct-published`. A number measured off a drawing
and converted is `scale-derived`, and it requires a scale RESOLVED against a
known reference span on that same reproduction — a printed scale in a title block
is not enough, because drawings get rescaled in reproduction. Marking a
scale-derived number as directly published is a validation error.

Evidence attaches to an archetype, and many rooms may inform one. What transfers
to a generic room is the proportion, not any single room's dimension. **A generic
scene is not a replica of a measured room and must never be presented as one.**

## Commands

```bash
npm run intake:environment -- <intake-request.json> [--out <dir>]
npm run derive:tiers -- <asset-id> <master.png> <out-dir> (--native | --native-detail-width <n> | --detail-unverified)
npm run scaffold:scene -- <scene-id> <label> <plate-width> <plate-height> [--family <id>] [--anchors kind:id,...]
npm run bank:art -- validate <asset-bank.json>
npm run bank:art -- normalize <asset-bank.json> [--out <file>]
```

`derive:tiers` requires an explicit detail declaration and has no default: which
of the three is true is a claim about the art's history, and a convenient default
would make it silently and wrongly.

The development authoring overlay is at `?view=scene-authoring`. It reads the
scene registry, writes nothing, and does not touch PlayerGame; captured values
leave only through the export block, by hand, carrying the certainty the author
chose.

## What can now feed the pipeline

- **User-approved masters** — declare lineage in an intake request; the pipeline
  measures, judges, derives tiers and seeds a scaffold.
- **Antigravity multimodal QA** — fill in an asset-bank manifest; `bank:art`
  normalizes and validates it. No entry may be dispositioned production while the
  questions that decide it are unassessed.
- **Antigravity measured-geometry research** — emit `MeasuredRoom` records with
  sources, scales and bases; the validator refuses fabricated precision.
- **Jules asset intake** — the intake request format is the seam; a file with no
  declaration is reported as undeclared rather than adopted.

## The legibility gate

A surface may carry information only if a reader could actually take it in. The
floor is 5% of plate height — about 54 lines at 1080p — and 5% of plate width
for anything with axes, rows or a legend.

This exists because of a specific and repeatable generative habit: models paint
two to five small frames on every shelf and sideboard, each blank, each looking
like an invitation. Promoting them produces a room of illegible dashboards, and
an illegible dashboard is worse than a painted rectangle because it asserts
something nobody can check. `slotIsPromotable` refuses them, and the refusals are
recorded as ambient decor so a later pass cannot quietly reverse one.

Two exceptions are built in, and both are about geometry rather than judgement:

- A **foreshortened** surface — a document on a desk, notes on a lectern — is a
  large physical page presenting a short rectangle to the camera. Its height
  floor is 3%; the width floor still applies, because perspective compresses
  height, not width.
- An **image-only** surface — a flag, a seal, a portrait, a nameplate — carries a
  known image or one line of text rather than a component, and has no component
  floor at all.

## The production library

Six approved environment masters exist. `src/authoring/fixtures/` carries them as
authoring records rather than research notes:

- `production-scene-families.ts` — the physical identity of each room, and what
  the World may call it. Two of the six are `jurisdiction-specific` and say so:
  one is painted with a real city's street map, the other's window frames a real
  capitol dome.
- `production-scenes.ts` — scaffolds carrying measured floor ramps, seat planes,
  staging positions and occluder rectangles. All five are deliberately
  unregistrable: the plates are Drive-only, so there is no raster, and nobody has
  decided a camera or a safe area, which is blocking.
- `dynamic-surface-authoring.ts` — which surfaces the simulation owns, which stay
  painted, and which component families each promoted surface may host.
- `production-asset-bank.ts` — the eight files as a QA bank. Nothing is
  dispositioned `production`, because the questions that decide it need eyes on
  pixels at size.
- `generation-queue.ts` — the remaining modular-person parts, each saying where
  the art already is rather than only that it is wanted.

## Civic symbols

Flags, seals and arms are identities with statutory citations, not art assets.
188 of them across 65 jurisdictions live in `art/manifest/civic_symbols.json`,
and every one carries `asset_status: "not-acquired"`: the registry records what
exists and where the law puts it, and the bytes are collected per jurisdiction
when a scene actually needs them.

Three rules are structural rather than advisory. There is no asset status meaning
"generated", so an AI-drawn seal is unrepresentable. A symbol that has not been
acquired cannot carry an asset path. And `symbolUsePermitted` refuses campaign
and commercial contexts outright, which is the misuse state statutes name.

## External packs

A downloaded pack has to survive two independent questions: what the licence
permits, and whether the files are the kind of thing this renderer draws. A CC0
pack of rigged meshes is perfectly licensed and unusable; a set of finished
plates with no licence file is usable and unavailable.

`use-now` requires both a licence stated in a document inside the archive and at
least one file of finished 2D art. Everything else is `archive` or `reject` with
a reason from a closed vocabulary, and `needs-rigging-or-render` is the standing
operating rule: no rigging, no Blender, no manual posing, and no time spent
pulling static art out of an animation rig.

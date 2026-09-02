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

| System | Module                               | What it owns                                                      |
| ------ | ------------------------------------ | ----------------------------------------------------------------- |
| 1      | `src/authoring/asset-lineage.ts`     | What a candidate must declare before it is production cargo       |
| 2      | `src/authoring/tier-plan.ts`         | Which rasters of the ladder may honestly be derived               |
| 3      | `src/authoring/scene-scaffold.ts`    | A structured, exhaustively-incomplete place to author geometry    |
| 4      | `src/authoring/measured-geometry.ts` | Provenance-backed measurements of real rooms, as an authoring aid |
| 5      | `src/authoring/semantic-context.ts`  | Physical scene family versus canonical world label                |
| 6      | `src/authoring/dynamic-surfaces.ts`  | Baked decor versus information the simulation owns                |
| 7      | `src/authoring/asset-bank.ts`        | The batch QA schema an external reviewer fills in                 |
| 8      | `src/ui/SceneAuthoringProofView.tsx` | The development overlay that reads coordinates off a plate        |

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

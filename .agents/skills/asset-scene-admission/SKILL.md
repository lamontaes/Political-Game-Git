---
name: asset-scene-admission
description: >
  Admits art into Our Civic Duty: checks a candidate's source, rights and
  lineage, derives runtime tiers, keeps world text in dynamic slots, runs the
  art gates and confirms the asset in play. Use for people figures and hair
  pieces, environment intake, scene geometry, asset-bank disposition, or
  release review; do not use to generate new art, infer rights, or approve
  pixels without review.
---

# Asset fit and scene admission

Read the relevant contracts before acting:

- `docs/systems/art-assets.md` for candidate versus runtime release;
- `docs/systems/scene-authoring-pipeline.md` and `docs/systems/scene-and-person-presentation.md` for scenes;
- `art/people-engine/v2/README.md` for the current people figures (whole figures plus separate hair pieces);
- `browser-visual-acceptance` for the check in play.

Reuse `scripts/art-asset-factory/`. Don't add a parallel validator or a scene-specific screen path.

## Workflow

1. Name the candidate, its source and lineage, its rights state, its manifest disposition, and the room, figure family or surface it serves.
2. Keep source master, derived tier, candidate and released runtime asset distinct.
   - Being visible online doesn't establish public-domain or commercial rights.
   - An external upscale must declare its parent. Repository tooling never enlarges a raster.
3. Environments: derive runtime tiers with `npm run derive:scene-tiers`.
   - Geometry starts unresolved.
   - Never infer a world label or access grant from a filename, family or tag.
   - Anything the simulation owns (names, seals, headlines, dates) goes in a dynamic slot, never in the picture.
4. People:
   - one whole figure per pose and angle, bald, with hair pieces fitted per angle;
   - seated people come from cut, per-seat occupants checked by hand;
   - scale, front and seat lines come from the room's staging data, not the art.
5. Run the art gates: `npm run validate:art`, `npm run inventory:art` and `npm run qa:art`.
6. Show the asset used by its real consumer in a drawn place, with a screenshot (`browser-visual-acceptance`). A count of derived files is not a usable room or person.

Deliberately authored fictional imagery is allowed, but its source, rights and role must be declared. Missing measurements stay missing and carry their real confidence class.

## Stop condition

Stop before release on unknown or incompatible rights, undeclared lineage, fabricated precision, unresolved blocking geometry, unreadable dynamic surfaces, a validation refusal, no real consumer, or a failed visual review. Report the exact art or metadata still needed.

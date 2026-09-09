---
name: asset-scene-admission
description: >
  Evaluate Political Game asset fit and scene admission from candidate evidence
  through runtime release and visual proof. Use for garment/body compatibility,
  environment intake, scene geometry, asset-bank disposition, or release review;
  do not use to generate new art, infer rights, or approve pixels without review.
---

# Asset fit and scene admission

Read the relevant contracts before acting:

- `docs/systems/art-assets.md` for candidate versus runtime release;
- `docs/systems/garment-morphology-fit.md` for body/pose fit;
- `docs/systems/scene-authoring-pipeline.md` and
  `docs/systems/scene-and-person-presentation.md` for scenes;
- `$browser-visual-acceptance` for real visual proof.

Reuse `scripts/art-asset-factory/` and existing authoring modules. Do not add a
parallel validator or scene-specific React/CSS path.

## Bounded workflow

1. Run `$project-operations` preflight. Name the candidate asset, source lineage,
   rights state, current manifest disposition, intended body/pose or scene family,
   dynamic surface, and actual consumer.
2. Keep source master, derived tier, development fixture, candidate, and released
   runtime asset distinct. Visibility does not establish public-domain or
   commercial rights. An external upscale must declare its parent and native
   detail; repository tooling never enlarges a raster.
3. For environments, use the existing sequence as applicable:
   `intake:environment`, `derive:tiers`, `scaffold:scene`, and `bank:art`.
   Geometry begins unresolved. Never infer a world label or access grant from a
   filename, family, or tag; simulation-owned text belongs in dynamic slots.
4. For garments, use the existing measured body-family + pose-family profile and
   `derive:garment-fit`. Never borrow across a missing pairing, loosen a bound to
   make a candidate pass, or treat a baked head as a finished face.
5. Run focused admission/negative controls, then the required art gates:
   `npm run validate:art`, `npm run inventory:art`, and `npm run qa:art`.
   Use `readiness:art` only for its existing preserved-asset reconciliation.
6. Prove the intended consumer and perform browser/visual acceptance. Report
   candidate failures as failures; do not turn a count of derived files into a
   claim that a person, wardrobe, or room is usable.

Deliberately authored fictional imagery/content is not prohibited, but its source,
rights, status, and role must be declared. Missing measurements stay missing and
carry their real confidence class.

## Stop condition

Stop before release on unknown or incompatible rights, undeclared lineage,
fabricated precision, unresolved blocking geometry, unreadable dynamic surfaces,
missing body/pose fit, validation refusal, absent normal consumer, or failed human
visual review. Report the exact residual art/metadata need.

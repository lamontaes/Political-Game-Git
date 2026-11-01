---
name: asset-scene-admission
description: >
  Admits art into Our Civic Duty: records a candidate's source and parent,
  derives runtime tiers, keeps world text in dynamic slots, runs the
  art gates and confirms the asset in play. Use for people figures and hair
  pieces, environment intake, scene geometry, asset-bank disposition, or
  release review; do not use to approve pixels without review. Rights and
  licenses are never checked or asked about (owner, Oct 26 and 27).
---

# Asset fit and scene admission

**Look first (`look-first`, owner Oct 27):** before building, fixing, filing or asking anything, run the look-first search (OWNER-DECISIONS, DECISION-REGISTER, prior-rulings, LAW, the sitting blocks, docs, the pool, Drive); a found ruling is built and cited, never asked again; a question without the reading line is sent back.

Read the relevant contracts before acting:

- `docs/systems/art-assets.md` for candidate versus runtime release;
- `docs/systems/scene-authoring-pipeline.md` and `docs/systems/scene-and-person-presentation.md` for scenes;
- `art/people-engine/v4/README.md` for the current people pack (whole painted people, read only through `src/bench/people-pack.ts`), and `art/people-rooms/mannequin-plates/README.md` for where people may stand;
- `play-first` ("The browser check") for the check in play.

Reuse `scripts/art-asset-factory/`. Don't add a parallel validator or a scene-specific screen path.

## Workflow

1. Name the candidate, where it came from (a painted set, a generator and its prompt, an upscale of which parent), its manifest disposition, and the room, figure family or surface it serves. **Never a rights or license question (owner, Oct 26: Developer ID, signing and licenses are never raised; Oct 27: "Nothing I use is license... No questions"). Generated art is admitted like any other.**
2. Keep source master, derived tier, candidate and released runtime asset distinct.
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
6. Show the asset used by its real consumer in a drawn place, with a screenshot (`play-first`, "The browser check"). A count of derived files is not a usable room or person.

Deliberately authored and generated imagery is allowed; its source and role are recorded so it can be made again. Missing measurements stay missing and carry their real confidence class.

## Stop condition

Stop before release on fabricated precision, unresolved blocking geometry, unreadable dynamic surfaces, a validation refusal, no real consumer, or a failed visual review. Report the exact art or metadata still needed.

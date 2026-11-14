---
name: asset-scene-admission
description: >
  Admits art into Our Civic Duty: records a candidate's source and parent,
  keeps world text in dynamic slots and confirms the asset in play. Use for people figures and hair
  pieces, environment intake, scene geometry, asset-bank disposition, or
  release review; do not use to approve pixels without review. Rights and
  licenses are never checked or asked about (owner, Oct 26 and 27).
---

# Asset fit and scene admission

**Look first (owner, Oct 27):** run `look-first` before building, fixing, filing or asking; a found ruling is built and cited, never asked again.

Read the relevant contracts before acting:

- `art/people-engine/v4/README.md` for the current people pack (whole painted people, read only through `src/bench/people-pack.ts`), and `art/people-rooms/mannequin-plates/README.md` for where people may stand;
- `play-first` ("Work", the screenshot acceptance) for the check in play.

The old art pipeline was deleted at the owner's word, Nov 5; there is no art validator or tier-derivation script to run. Backdrops are imported with `scripts/backdrops/` (`import-place-backdrops.mjs`, `import-capitol-backdrops.mjs`). Don't add a parallel validator or a scene-specific screen path.

## Workflow

1. Name the candidate, where it came from (a painted set, a generator and its prompt, an upscale of which parent), its manifest disposition, and the room, figure family or surface it serves. **Never a rights or license question (owner, Oct 26: Developer ID, signing and licenses are never raised; Oct 27: "Nothing I use is license... No questions"). Generated art is admitted like any other.**
2. Keep source master, derived tier, candidate and released runtime asset distinct.
   - An external upscale must declare its parent. Repository tooling never enlarges a raster.
3. Environments: a backdrop enters `art/backdrops/` through `scripts/backdrops/` and its manifest row.
   - A new backdrop also gets one row in `art/backdrops/categories.json` (its group, the settings, office kinds and scene types it serves); the `scene-pictures` guard fails a painted place without one. Scenes are mapped to pictures in `situationPlaces` (skill `scene-pictures`).
   - Geometry starts unresolved. Room staging waits while busts are coming (owner, Nov 10): do not file or reopen full-body staging defects (who stands where, people blocking each other); how busts are shown is his call.
   - Never infer a world label or access grant from a filename, family or tag.
   - Anything the simulation owns (names, seals, headlines, dates) goes in a dynamic slot, never in the picture.
4. People:
   - one whole figure per pose and angle, bald, with hair pieces fitted per angle;
   - seated people come from cut, per-seat occupants checked by hand;
   - scale, front and seat lines come from the room's staging data, not the art.
5. Show the asset used by its real consumer in a drawn place, with a 1440×900 screenshot (`play-first`, "Work"). A count of derived files is not a usable room or person.

Deliberately authored and generated imagery is allowed; its source and role are recorded so it can be made again. Missing measurements stay missing and carry their real confidence class.

## Stop condition

Stop before release on fabricated precision, unresolved blocking geometry, unreadable dynamic surfaces, a validation refusal, no real consumer, or a failed visual review. Report the exact art or metadata still needed.

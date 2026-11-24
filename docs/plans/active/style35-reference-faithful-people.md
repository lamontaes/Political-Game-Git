# STYLE35 — reference-faithful painted people (candidate input)

Authority: STYLE35 at the top of the modular-people authority document and
the PLAYTEST34 assignment board row "STYLE35". Owner: one isolated STYLE
authoring session (Claude Code / Fable 5.1), worktree
`/Users/lamontae/Documents/Political-Game-STYLE35`, branch
`style35/reference-faithful-people`, based on B's committed head
`eba9b79b` (codex/playtest34-b) so the real room, portrait and appearance
controls can be exercised. B retains runtime and appearance-state ownership;
A retains application integration; V's ep34 input is untouched.

## What was inspected first

- Owner reference: Drive `1I5aKH5LOysShQegxO2v-RNM4fg_Au-yk`, byte-identical
  local copy (10,581,645 bytes, 5376×3024), speaker crop used as the style
  target. Reference only; not redistributed except as a reduced crop inside
  `qa/reference.png`.
- V's newest ep34 result at `ec428c75` (six vector families, softened paint):
  clean but flat, identical drawn face on every body. Not duplicated.
- The already-delivered full-resolution painted inputs in the repository
  (heads 3584×4800, bodies 5056×3392, garment sheets 3584×4800, hair,
  footwear). These carry the reference's facial planes, cloth folds and ink
  weight; they are what this family uses.
- The 90 MB Drive import pack (`PEOPLE-owner-existing-reference-trial.zip`)
  could not be materialized through the connector; its mapped sources are
  the retained repository files above.

## What was built

`art/authoring/engine-people35/` — see its README for construction, commands
and the honest limitation list. Six families × 34 parts (12 shared painted
heads, 8 shared hair pieces, per-family body, 2 tops as sleeves/torso/collar,
2 bottoms, shoes, 4 painted-feature placeholders). Same `engine-people29-v1`
consumer contract; independent head, hair, top and bottom swaps; five skin
ramps, three hair/top/bottom ramps through the existing material path.

## Actual tested behavior (this branch, 2026-09-14)

- `build.py --check`, `validate.mjs`, `validate.test.mjs` (4 tests),
  registration `--check`: pass.
- `npx vitest run src/presentation/engine-people29.test.ts`: pass after the
  generation expectation moved 6 → 7. `people-coherence.test.ts`,
  `weekend19-modular-people.test.ts`: pass.
- Pre-existing on B's committed head (verified on a detached checkout of
  `eba9b79b`): one typecheck error in `PersonAppearanceControls.tsx` (an
  `OutfitResult.message` access) and the Lexington place lookup failure in
  `playtest34-ordinary-people.test.ts`. Neither is introduced here.
- In the running development server (`?art-preview=candidate`), a fresh life
  rendered a household member in the real apartment room from the ep35
  generated components; the player's own saved appearance rendered through
  the material Blob path with every layer `ready` and no `unavailable`.
- Through B's appearance controls on the same saved person: shirt and trouser
  swap (oxford/wool → polo/chino) without changing face or body; then body
  `ep35-masc-heavy` → `ep35-fem-lean` with Apply, face → `head-11`, skin →
  `deep-brown`, hair → `tapered-natural`; recipe key and all layers updated.
- Same replay address on B's baseline server (generation 6) and this server
  (generation 7) rebuilds the same world and household person; captures in
  `qa/room-before-*.png` / `qa/room-after-*.png`.

## Handoff

**B (runtime / appearance state):** accept or adjust the loader extension in
`engine-people29-svg.ts` (embedded-PNG `<image>` only), the ep35 registry
joins in `engine-people29-data.ts` / `engine-people29-review.ts`, the
registration script's `--pack=engine-people35` and shared-part rule, and the
body-list filter widening to ep35 in `PersonAppearanceControls.tsx`. Decide
whether generation 7 becomes the fresh-life default or stays behind a
selection; old saves and gen5/gen6 pins are untouched by this branch. The
typecheck error and the place-lookup test failure pre-date this work.

**A (integration):** the branch is additive; no shared-root, scene, clock or
save-format change. Integrate the frozen head B accepts, in the candidate
preview only. Room scale of the candidate figure follows the existing body
anchors and is not recalibrated here.

**Remaining art dependency (narrow, no spend authorized):** none is required
for the standing-front six-body candidate. For seated and lectern poses the
painted body sheets already contain the poses, but seated garment art does
not exist; that is the one exact source-art request if seated people are
assigned: seated-front trousers/skirt and a seated shirt cut on the existing
painted sheets' style, transparent background, same 1194×1200 cell grid.

## Not claimed

Human visual acceptance, production promotion, rights clearance, Safari or
packaged-app proof, and whole-suite validation on this branch.

## Recovery handoff, 2026-09-14

The bounded standing recovery is frozen for A's integration. Exact source:
`da6344d23797f6190471fe828c23fa71bd800a6f` plus preserved dirty/ignored work,
recovered in `/private/tmp/pg-style35-successor`, branch
`codex/style35-recovered-standing`. See the authoring README's recovered
checkpoint section for actual fresh checks and remaining source-art gaps.
The preceding "Actual tested behavior" section is the exhausted author's
historical report; native control acceptance belongs to A's combined journeys.
No broader pose work was attempted during this recovery. The active art plan
remains open for its explicitly absent pose/source and human visual acceptance
work; this frozen increment is a useful standing delivery, not closure of those
requirements.

## PEOPLE38 continuation (2026-09-14): engine-people36 successor

Footage `hhhh_visual_handoff` (A's combined build 33a1ced1 at port 5277, which
draws the ep35 part bytes unchanged) showed the household person "Victor
Grant" with a detached-looking neck, oversized floating shoes and heavy
outlines. Source → assembly → game comparison located all three in the ep35
authoring, not in A's integration (A's deltas over B's head are only the
`MaterialImage` scene wrapper and a portrait-crop frame).

Built `art/authoring/engine-people36/` (see its README): body neck retained,
head neck faded at the jaw, dark-detail classification limited to the eye
band, ankle/foot-based shoe scale without the source drop shadow, softer ink
and wider skin mid-tones, shoulder seam lift. Six families, same shared heads
and hair, same swaps. ep35 frozen as generation 7 with a signed ledger
(`cli-freeze-engine-generation.ts`); ep36 lifts to generation 8.

Checks on this branch: build `--check`, registration `--check`, validator
(6 families valid), 4 contract tests, `engine-people29.test.ts` (generation 8)
pass. Same replay seed at generation 7 and 8 draws the same household person
in the same room with ep35 and ep36 respectively (`qa/room-gen7-vs-gen8.png`);
the player's saved appearance at generation 8 renders through the material
path with every layer ready; garment swap on that person verified in the
running server. Old-generation control: the generation-7 replay on the same
server still draws ep35 parts (not repainted).

Handoff to B/A: accept `engine-people36` alongside `engine-people35`
(loader glob, data/review joins, register pack list, controls regex
`ep3[456]`, generation-7 ledger). Fresh lives should default to generation 8;
generation 7 lives keep ep35. Mechanical whole-suite runs are A/Codex work.

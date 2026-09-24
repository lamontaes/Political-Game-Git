# The two people can be finished without regenerating them, but the fitter never touched their edges

Three decisions from you, listed first below, decide how this work resumes.
The existing engine can carry the current man and woman to clean
front-standing figures without generating whole people again. Their visible
defects come from Art's one-off cutout scripts, which picked garment pixels by
color from dressed images painted on white. The fitter only cropped each part.
Five defects need Art to recut existing cutouts, one needs a cleanup step the
fitter lacks, and one needs new paint on the woman's top. Three selection flaws
can still show the old hair and hand after repairs. Nothing is approved, and
all work remains stopped.

## What you need to decide

1. **Whether to resume by repairing the current art instead of generating new
   people.** That route has three parts:
   - Art recuts five cutouts, and the woman's top gets new shoulder paint
     from whoever you pick in decision 2.
   - The fitting team adds a light-background cleanup step and four intake
     fixes.
   - The receiving team fixes five selection and loading problems.
2. **Who supplies the missing fabric on the woman's top.** Nothing is painted
   under the shoulders her long hair used to cover. The two choices are Art
   painting those shoulders on the current top, or a new top authored on her
   body's outline.
3. **Whether a repaired part replaces the old one or sits beside it.** Today
   the cleaned curls and the corrected hand sit in the same family as the old
   versions, so a new character gets either one at random.

## The defects, and where the first wrong pixel enters

Claims are measured, meaning pixels read from the images or code read at the
cited line, unless marked as inferred. In the Repair column, "Art recut" means
Art redoes a cutout from the art it already has. "Fitting step" means a
reusable preparation step. "New paint" means new source art.

| Defect                                   | What the pixels show                                                                         | First wrong stage                                                                                                            | Evidence                                                                   | Repair                                                                                                                         |
| ---------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Woman's neck band                        | At "Light" skin, face and upper neck keep tan paint while the lower neck and arms turn light | Registry: head v1 lists no skin color map                                                                                    | v8 combined registry, familyAdditions fem-average entry 1, "materials": [] | Done: the new semantic head, entry 13, has one. The save must still select that head                                           |
| Collar rim, new                          | Two rim colors, (238, 164, 108) and (112, 79, 57), identical on all seven skin tones         | Source cutout of the top: a 4-pixel widening kept the dressed model's neck skin (inferred by elimination)                    | build_parts.py:46-50                                                       | Art recut of the collar                                                                                                        |
| Man's curls                              | Pale warm pixels at hairline, temples and ears                                               | Source cutout: forehead and ear pixels from the donor image                                                                  | hair-source-receipt-v2.json, man.constraint                                | Done in curls v2, but still a random pick (below)                                                                              |
| Man's hand opening                       | Pure white (253, 253, 253) beside a dark brown background (55, 39, 30) in your screenshot    | Source paint: 324 opaque near-white body pixels, the same before and after Art's 16-pixel thumb patch                        | build_hand_web.py:45                                                       | Art recut to make the opening see-through. The patch paints only where the body was already see-through, so it cannot close it |
| Light halos around hands, arms and jeans | A 1-pixel edge lighter than both neighbors, such as (102, 100, 96)                           | Source paint: the white generation background stays in soft edges                                                            | source_parts.py:25-28                                                      | Fitting step: light-background cleanup                                                                                         |
| Spikes along the jeans seams             | Dark streaks along both outer seams, lighter on the woman                                    | Source paint: Art's fill copies the nearest garment pixel, often the dark outline, into gaps                                 | build_denim_underpaint.py:155                                              | Art recut: fill beneath an opaque neighbor instead                                                                             |
| Doubled outline outside the woman's arms | A pale second contour beside each arm                                                        | Source cutout of her body: two arm sources merged that "vary by a few pixels" (inferred, medium confidence)                  | prepare-matched-woman-v22.py:70-71                                         | Art recut of the arms                                                                                                          |
| Shoulders above the woman's top, new     | Skin-colored wedges and dark notches at the neck and shoulder once the pixie exposes them    | Source paint: the top's outline came from a figure whose hair covered the shoulders, with nothing painted beneath (inferred) | build_parts.py:105-110                                                     | New paint (decision 2)                                                                                                         |
| Dark band outside the man's sleeve, new  | Arm color outside the olive sleeve edge                                                      | Source cutout: a 3-pixel widening plus a color filter let shadowed skin into the top (inferred)                              | build_revisions.py:92-96                                                   | Art recut of the sleeve                                                                                                        |

The jeans fill added 2,738 pixels to cover 1,787 uncovered pixels on the man,
and 1,171 pixels to cover 935 on the woman (denim-underpaint-receipt-v5.json).
It adds more than it covers because the script deliberately extends each fill
2 pixels past the gap as overlap (build_denim_underpaint.py:100). How many
filled pixels became visible spikes was not counted; the spikes are what the
render sheets show. The top's shoulder defect passed its check
because the measurement looked only at rows 350 to 550 of a 1,536-row image,
which leaves out the shoulders (woman-casual-top-measure-RESULT-v5.json:73).

## What the fitter did to these two people

Each current part's preparation entry is a crop at scale 1 with a 128-pixel
shift (matched-woman-average-v15-native-separation-manifest-v1.json:14), and
at that scale the warp copies pixels exactly (`fit_core.py:155`). None of the
448 exported descriptor and receipt files names any of the fitter's edge
tools. That covers underlap, protected masks, edge-topology repair, anatomy
overrides, sleeve occlusion, collar contact and the smooth warp bake. The v6,
v7 and v8 registries were built by one-off scripts such as
stage_prepared_identity.py, not by the fitter's intake route.

Art does the five recuts. For the jeans, the fitter's existing underlap step
could do the same work, because it copies paint only beneath a neighboring
opaque part (`source_parts.py:31-41`; inferred that it suits these jeans). The one missing tool is a cleanup step for white and light
backgrounds. The repository has one for green backgrounds
(`edge-despill.ts`), and no file in the fitter calls it (measured by
searching all 49 exported fitter files).

## Three selection flaws that can undo the repairs

1. **The repaired curls and the corrected hand are a coin flip.** Curls v1 and
   v2 share one family, as do the old body and the thumb-web body, and neither
   is marked as replacing the other. A new character makes a seeded random
   pick within the family (`character-components.ts:2898` in the Mac copy), so
   it may get the old version.
2. **The pixie can land on a head it cannot attach to.** The registry makes it
   compatible only with the semantic head (v8 registry, pixie asset,
   compatible_head_families). A new woman's head is also a seeded pick, which
   contradicts the registry's own note that the semantic head must be selected
   explicitly (v8 registry limitations, item 6).
3. **Older test characters may stop loading.** Here "generation" means a
   version of the art catalog, not a family generation. The v6 test characters
   are pinned to catalog version 18, the v7 catalog stops at 17, and every
   snapshot shares one review save database (inferred; not run). The game
   stops with an error when a pin exceeds the newest version
   (`character-components.ts:2117-2126`).

The game draws each part from a prepared picture wrapper, and it fetches that
wrapper with no hash check (`engine-people29-svg.ts:12-21` in the Mac copy).
Pose packs can still fall back to built-in art (`pose41-adapter.ts:93-104`).

In the earlier v6 route result, the woman's hair was present on the first
screen and missing from Creator, People and the reopened save (route result
file, line 135). Its cause is unknown.

## Head turns, other poses and hair

Hair is placed on the body's anchor in its own frame. It lines up with the
head only because preparation fitted it there
(`character-components.ts:3036-3057`). When a pose or facing has no matching
hair, the game shows a status message instead of drawing front hair
(`character-render-plan.ts:368-373`). No figure is ever mirrored; the only
mirroring rules in the game's styles are for office curtains
(`player.css:219`).

The two people's registry holds only front hair; it has no back-hair part at
all (v8 registry, component kinds). Side, back and seated hair need their own
painted art. The fitter's rules say another pose or view "requires its own
authored source, mask and guide" (README:115-116).

## The smallest proof before work resumes

The proof uses one top authored on a transparent background with its own
masks, plus one short hairstyle with a measured scalp outline. Both enter only
through the fitter's intake, measurement, registry and freeze steps. Then they
go through Creator, room, People, Save, reopen and Continue.

It passes when both bodies show clean edges at game scale on all seven skin
tones and every hair color offered. Two more checks must pass: switching
bodies, and a character saved before the change that still looks the same.

Five pieces are missing today:

1. The fitter's body check accepts only 600 by 1,200 images; the current
   bodies are 768 by 1,536 (`rig.py:25-26`).
2. The two current heads lack the measured head descriptions hair intake
   requires (`intake.py:36-52`).
3. The light-background cleanup, plus an edge-fringe check in measurement.
   The only edge step today discards nearly invisible pixels
   (`source_parts.py:25-28`).
4. A check for hair. The fit measurement handles garments only
   (`fit_measure_bridge.ts:443-444`).
5. A route from the fitter's registry output into what Creator loads. None of
   the exported registries came from that route (see "What the fitter did").

## What happens next

This audit repaired nothing, and the stop remains in force. If you resume,
the work splits this way:

- **Art:** recut the collar, sleeve, hand opening, jeans fill and the woman's
  arms, and paint the top's shoulders if you choose that in decision 2.
- **Fitting team (V):** add the light-background cleanup and accept 768 by
  1,536 bodies. Also add measured head descriptions, a hair check and the route
  into Creator.
- **Receiving team (O):** mark repaired parts as replacements, make a new
  woman select the semantic head, and give each snapshot its own review saves.
  Also check drawn artwork against its hash, and close the pose fallback.
- **Integration team (U):** find why the woman's hair vanished in the v6
  route, then run the proof in Creator.

Two repository risks sit outside the characters. The Mac branch predates main's
September 22, 2026 change that prepares neighboring bodies in the Creator ahead
of time (`bd6989f99`), so merging the branch as-is would undo it. Eight full
review snapshots also sit in the shared output folder, about 41,000 files. The
export does not record their size in bytes.

## Method

Read-only audit on September 24, 2026. Pixels were read from your two
screenshots and the fitting team's render sheets. Code was read from the
hash-checked export of the Mac checkout, commit `ad75e8e3` plus its
uncommitted files, and compared with main at `c59daf596`. Three reviewers
traced preparation, the Mac game code line by line, and main's renderer. The
collar, hand, family and denim claims were re-checked by hand. No art was
generated, no code or mask changed, and no browser, build or install ran.
Which layer owns each halo pixel needs the layer-separated prepared images,
which the export did not include.

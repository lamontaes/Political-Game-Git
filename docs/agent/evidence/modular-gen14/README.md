# MODULAR-GEN14: the life path now composes from the fitted Visual4 provider

Branch `claude/modular-gen14-visual4-provider`, cut from UI144 at `302e1f0c`
because `src/presentation/art-preview.ts` exists only there while the Visual4
files are on `main` — the integration needs both, and no other base has them.

Nothing in `src/player/` is touched. PT3 owns `PlayerGame` and scene
composition; this is the provider underneath it.

## The disconnection, measured

There were two candidate providers, and the life path was on the worse one.

|                                                                              | records | body families            | garment fit bank |
| ---------------------------------------------------------------------------- | ------- | ------------------------ | ---------------- |
| `CANDIDATE_REVIEW_*` — what the life path used                               | 35      | **2**                    | **none**         |
| `PEOPLE_VISUAL4_*` — reachable only from `?view=character-proof&set=visual4` | 659     | 11                       | yes              |
| `PRODUCTION_*`                                                               | 46      | 3 (all `dev-*` fixtures) | yes              |

The older library's own comment says it plainly: candidates there are reviewed
UNFITTED, and no candidate has a fit profile. So the fitted figures being
reviewed in the gallery and the figures being played in the room were never the
same figures, and every generated person in the game drew from one of **two**
bodies with garments sitting where they were drawn rather than on the body.

`artPreviewLibraries` now returns the Visual4 provider. One provider, one
answer: the proof route and the life path compose from the same library, so the
gallery can no longer disagree with the game about what the bank contains.

## The body-eligibility repair

Switching alone was not enough. Of the 11 Visual4 body families, six have no
top, bottom or footwear declared between them, and the resolver was handing
identities to them anyway — the body refused, and `head`, `top`, `bottom` and
`footwear` all reported empty behind it.

Across 48 seeded people at `standing-neutral`:

```
before   9/48 clean   diagnostics: required-family-unavailable ×33,
                      required-slot-empty ×41, slot-family-has-no-art-for-pose ×8
after   48/48 clean   diagnostics: none
```

The rule applied is the library's own, which it already stated for garments and
hair — "an empty compatibility list is a measured refusal" — and had simply
never applied to bodies. Excluded bodies stay banked in the registry and are
now _named_ rather than silently partial, through
`PEOPLE_VISUAL4_UNDRESSABLE_BODIES`.

**This is not a guard being removed.** I checked first whether the gap was
bookkeeping: every measured (garment, body) pair in
`character_candidate_visual4_fit.json` is already declared compatible in the
registry — 74 pairs, zero undeclared. So the six families are short of pixels,
not metadata, and there was nothing to "repair" into existence.

## Variety, measured rather than counted

200 seeded people at `standing-neutral`, distinct components resolved:

| slot       | distinct | note                                 |
| ---------- | -------- | ------------------------------------ |
| body       | 5        | evenly spread — 43/41/40/39/37       |
| head       | 9        | evenly spread                        |
| hair-front | 150      |                                      |
| hair-back  | 30       |                                      |
| top        | 23       |                                      |
| **bottom** | 12       | **but `khaki_shorts` on 165 of 200** |
| footwear   | 7        | per-body fitted derivatives          |

The bottom column is the honest ceiling and the next dependency. Only
`wave-a-average-man-standing-neutral-front-a` has more than one bottom declared
(12); the other four dressable bodies have exactly one, so four fifths of all
generated people wear the same khaki shorts — and on the two women's bodies
they are a garment authored for a man's.

A large combination count does not establish usable variety. This is what
usable variety actually looks like today.

## The real route, in the ordinary application

Local review run: `/opt/pw-browsers/chromium` 141.0.7390.37 at 1440×900. **Not**
the pinned harness — `@playwright/test` here resolves a Chromium build this
container cannot download, so this is not `npm run test:e2e` and is not
reported as it.

Three seeds (`gen14-a/b/c`), Kentucky, age 34, `shares-a-home`, entered through
the replay descriptor and the real opening flow, in `?art-preview=candidate`.

Every seed completed: room → selected person → quick dossier → full record and
portrait → clothing choice → save → reload.

```
seed gen14-a  Isabel Bell, who you live with   6 layers, no refusal
  wave_a_average_woman_standing_neutral_front_a_v1_pv4.png
  pv4_wave_a_female_top_navy_zip_hoodie_v1.png
  pv4_wave_a_male_bottom_khaki_shorts_v1.png
  pv4_ocd_head_adult_tan_round_young_v1.png
  pv4_hair_58_tan_round_young_v1_front.png
  pv4_wave_a_footwear_low_top_sneaker_gray_v1_
      wave_a_average_woman_standing_neutral_front_a_v1_pv4.png   ← per-body fit
```

That last filename is the proof the fit reaches the room: it is a footwear
derivative cut for that exact body family, not a generic sneaker.

Checks that passed on every seed:

- **portrait layers are identical to the room layers** — one identity across
  contexts, not two compositions of the same person
- **the player is not standing in their own room** — first-person preserved;
  scene people come from beat bindings, which are NPCs by construction
- **`data-appearance-catalog="candidate-review"`**, 11–12 tops offered, a
  different top chosen and applied
- **only `political-life-worlds-art-preview` exists** after saving; the
  ordinary database is never created, so an ordinary save cannot be touched
- reload returns the same room and person

Screenshots: `gen14-{a,b,c}-{room,dossier,wardrobe}.png`.

## Where to look at a whole person

Two surfaces, one provider now behind both.

**The review set** — `?view=character-proof&set=visual4`, five named people
(Morgan Graham, Jeremiah Waller, Rachel Saunders, Levi Sharp, Xavier Tillman),
each a full figure at reviewable size with Body / Face / Hairstyle and
top / bottom / footwear selectors over it. `gallery.png`. This is the surface
for an actual visual decision, and it is no longer a second source of truth: it
composes from exactly the library the life path now uses.

**The life path** — any life in `?art-preview=candidate`. The people are the
same people, but see the two findings below: in the room the moment panel
covers everything below the chest and the crown is clipped, and the dossier
portrait is a ~40px thumbnail. So the life path proves the provider is wired
and the review set is where the art is judged, until those two are addressed.

## Controls

| Control                               | Result                                                                                                        |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 13-year-old sister, candidate preview | refused: "candidate-bank has no child body: this person is 13, and every banked review body is an adult body" |
| adult, PRODUCTION route (no preview)  | does not draw; refusal `scene-declares-no-floor-calibration`; only `political-life-worlds` exists             |

The second control is the important one: production still refuses in exactly
the room the preview draws in. No production gate was weakened to make this
work — the preview is the labelled exception, and it is the only thing that
changed.

## Two findings that are not mine to fix

Reported rather than patched, because `src/player/` is PT3's.

1. **The moment panel covers the figure's centre.** Hit-testing the token at
   its own centre returns `section.game-story`; the upper body returns the
   person. Pointer selection therefore works only on the part of the figure
   that is not behind the panel, and this is at the default 1440×900.
2. **The figure is cropped at the head** in the residence — the token carries
   `figure-taller-than-space-above-contact-line: 5.5%`, and hit-testing at the
   head returns nothing because it is above the viewport. Faces are the thing a
   reviewer most needs to see.

## Exact remaining dependencies

Named in the bank's own terms. No invented coordinates or ids.

**Blocking wider body variety — garments for four banked bodies:**

| body family                                           | needs             |
| ----------------------------------------------------- | ----------------- |
| `wave-a-older-woman-standing-neutral-front-a-v1-pv4`  | `top`             |
| `wave-a-older-woman-standing-neutral-front-b-v1-pv4`  | `top`, `footwear` |
| `wave-a-skinny-woman-standing-neutral-front-a-v1-pv4` | `top`             |
| `wave-a-skinny-woman-standing-neutral-front-b-v1-pv4` | `top`             |

Each needs a garment declaring that family in `compatible_body_families` and a
measured profile in `character_candidate_visual4_fit.json` with
`pose_family: "standing-neutral"`. Existing tops for the other bodies are the
compatible reference assets; canvas and anchors are the ones those bodies
already declare. Nothing about the bodies may change.

**Blocking any seated person:**

| body family                                        | needs                       |
| -------------------------------------------------- | --------------------------- |
| `wave-a-average-woman-seated-front-neutral-v1-pv4` | `top`, `bottom`, `footwear` |
| `wave-a-skinny-woman-seated-front-neutral-v1-pv4`  | `top`, `bottom`, `footwear` |

Both declare `pose_family: "seated-guest-neutral"`. Note the separate authoring
question this raises: a body family currently encodes its pose, so
`…-skinny-woman-seated-…` and `…-skinny-woman-standing-…` are different
identities rather than one person in two poses. Until that is decided, a seated
anchor honestly refuses rather than substituting another person's body — which
is the correct behaviour and is what happens today.

**Blocking bottom variety:** bottoms fitted for the four non-`average-man`
dressable bodies. One garment on four fifths of the cast is the most visible
sameness in the current output.

**Not blocked on art:** the seven rooms without floor calibration. That is a
measurement, and the fix is to measure it — no estimate from any report here
may be copied in.

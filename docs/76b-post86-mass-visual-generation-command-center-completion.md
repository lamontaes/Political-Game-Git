# 76B — Post-#86 Mass Visual Generation Command Center — Completion Report

Packet: `76_CLAUDE_POST86_MASS_VISUAL_GENERATION_COMMAND_CENTER`
(Drive `1GICdlYPVoa8dtZeVSNGFDxE1owPPCYwZ-r0v0xo4ipk`).

---

## 1. Preconditions, in the order the packet set them

| #   | Requirement                            | Result                                                                                                                                                                          |
| --- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Fetch live GitHub                      | Done.                                                                                                                                                                           |
| 2   | Verify #86 merged                      | Confirmed merged.                                                                                                                                                               |
| 3   | Record the exact new accepted main SHA | **`5f735da209c59647e4b877717a40fe6cc045fc24`** — the merge commit for PR #86 (`claude/total-graphics-runtime-integration`). Its first parent, `a35da54`, was #86's frozen head. |
| 4   | Start from merged main                 | The working branch was cut from `5f735da`, not from the merged #86 branch.                                                                                                      |
| 5   | Inspect PR #87 READ-ONLY               | Read only. **No commit, no push, no comment, no label change on #87.**                                                                                                          |
| 6   | Do not modify PR #87                   | Honoured.                                                                                                                                                                       |
| 7   | Fresh Drive asset scan                 | Performed. Result and its one hard limit in section 7.                                                                                                                          |

**New branch:** `claude/post86-mass-visual-generation-command-center`, cut from
`5f735da`. The merged #86 branch was not reopened, extended, or touched.

---

## 2. Headline result

**The eight adult feminine body poses did not need regenerating. They needed a
green channel repaired, and it was repaired provably.**

The p71 intake had classified all eight `REVISE` for a green matte edge. The
default next step was seven or eight new generations — a wave of prompts, an
upload cycle, a re-chop, and a fresh round of intake QA, to end up with different
art of the same body.

Measuring first changed the answer. The interior of every pose — 477,813 pixels
at alpha ≥ 250 on the first file — carries **zero or one** green-dominant pixel.
There is no green garment. All contamination sits within 1–8 px of transparency.
So a deterministic despill was legitimate, and it worked:

- Green fringe **66.78–79.75% → 0.00%** on all eight.
- **309,859 pixels** repaired.
- **Alpha SHA-256 identical before and after** on all eight — the silhouette, and
  therefore the morphology and the pose, did not move.
- **Interior RGB SHA-256 identical before and after** on all eight — skin,
  fingers, feet, clothing edges, neck seam and hands are the bytes they were.
- Zero pixels needed the arithmetic clamp fallback. Zero files classified
  `RE-EXPORT PREFERRED`. Zero classified `REGENERATION REQUIRED`.

**Eight regenerations avoided.** Full method, options, per-band figures and the
classification rule for the next batch are in 76A section 4.

---

## 3. What changed in the repository

One commit on the new branch: `c90d7e6` — _"Take the green off eight bodies
instead of asking for eight more."_ 16 files, 7,015 insertions.

| Path                                                  | What it is                                                                                                                                                                                                                                                                               |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/art-asset-factory/edge-despill.ts`           | The salvage. Green-edge despill that never writes alpha, reconstructs RGB from interior neighbours, and gates on measured interior green so a genuinely green garment is protected. Emits SHA-256 digests of the alpha plane and the interior RGB as proof.                              |
| `scripts/art-asset-factory/cli-edge-despill.ts`       | `npm run despill:edges`.                                                                                                                                                                                                                                                                 |
| `scripts/art-asset-factory/measure-reference.ts`      | Measurement Cards. Container detection by magic bytes, PNG and JPEG decode, scene cards and figure cards, every field confidence-labelled.                                                                                                                                               |
| `scripts/art-asset-factory/cli-measure-references.ts` | `npm run measure:references`.                                                                                                                                                                                                                                                            |
| `tests/edge-despill.test.ts`                          | Five tests. Digest equality with no tolerance; the defect measurably cleared; the report reproduces its own output from the source it names; a synthetic green-garment torso engages the gate and keeps its interior; the classifier refuses to call a run salvaged when a digest moved. |
| `art/qa/p76/edge_despill_report.json`                 | Machine-readable salvage record, 8 entries.                                                                                                                                                                                                                                              |
| `art/qa/p76/reference_measurements.json`              | Machine-readable Measurement Cards: 9 scene cards, 40 figure cards.                                                                                                                                                                                                                      |
| `art/generated/candidates/ocd-p76/bodies-despilled/`  | The eight repaired rasters, 9.7 MB.                                                                                                                                                                                                                                                      |
| `package.json`                                        | Two scripts: `despill:edges`, `measure:references`.                                                                                                                                                                                                                                      |

Nothing in `src/` changed. No runtime behaviour changed. No manifest entry
changed. This run added tooling, evidence and repaired candidate art — it did not
alter what the game does.

---

## 4. The mass-generation bank

`74_GEMINI_VISUAL_GENERATION_AND_REVISION_ONE_STOP_PROMPT_PACK` is the operating
document. It is written to be used exactly one way:

> **Attach the named reference image and say `Run prompt N`.**

**36 numbered entries covering 38 prompts. 35 are ready to run today** — three
(E1–E3) are held pending pixel intake of the Drive-root uploads, and one (G1) is
Claude-side processing rather than a generation.

Every prompt carries, without exception: status, purpose, which consumer needs
it, the exact reference image to attach with its Drive ID, target dimensions,
whether transparency is required, grid layout, style authority, the measured
geometry it must hit, camera concept, furniture-topology constraints, forbidden
baked content, the full paste-ready prompt text, an acceptance checklist, the
upload destination and filename, and explicit upscale / background-removal /
Claude-processing instructions.

There is no shorthand anywhere in it. No prompt says "generate a classroom" or
"improve this". Nothing asks Lamontae to determine a measurement, a reference, a
dimension, a layout, a camera or an acceptance criterion.

| Wave  | Contents                                                                                                                                       | Items      | Parallelism                                      |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------ |
| **A** | Body / morphology authorities: masculine ordinary, lean, heavy; feminine lean, ordinary; older adult                                           | 6          | all independent                                  |
| **B** | Three missing poses for the existing family; front-on footwear; tops; bottoms                                                                  | 4          | B1, B2 independent; B3–B4 want an A result first |
| **C** | Child ~9 (6 heads tall); adolescent ~15 (7 heads tall)                                                                                         | 2          | independent                                      |
| **D** | Ordinary-life scenes: classroom surgical edit, workplace, clinic, grocery aisle, residential street                                            | 5          | independent                                      |
| **E** | Campaign / political scenes: casework counter, debate stage, fundraiser, caucus room, school board (+ E1–E3 held)                              | 5 + 3 held | independent                                      |
| **F** | Future political-life bank: EOC, courthouse corridor, press scrum, TV studio, bilateral, diner, hospital, polling place, canvassing, town hall | 10         | independent                                      |
| **G** | Prop sheets and a 12-state expression sheet                                                                                                    | 3          | independent                                      |

### Generate these first

**A1, A2, A3, A4, A5 — five body sheets, all in parallel — then C1 and C2.**

The reason is a single fact: the game has **no released production body**. Every
character component in the manifest carries `released: None`, so no person can be
composed into any of the seven released rooms. That is the only P0 left in the
project, and Wave A is the whole of the fix. Waves D, E and F can run in parallel
at any time; scenes and bodies do not depend on each other.

---

## 5. Body / morphology matrix

Build (lean / ordinary / heavy) × life stage (child / adolescent / adult / older
adult), crossed with presentation lean. **Race and ethnicity are never a
body-geometry category** — complexion is a separate art property already modelled
on bodies and heads, and head shape is its own family axis.

Two named failure modes the prompts refuse: not every masculine body is athletic,
and not every feminine body is an hourglass. _Ordinary_ means ordinary in both
directions, and each prompt says so in its own words.

Coverage against the six-pose minimum (`standing-neutral`,
`standing-conversational`, `standing-listening`, `seated-guest-neutral`,
`seated-at-desk`, `standing-podium-or-lectern`), for the one family that has art:

| Pose family                  | State                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------ |
| `standing-neutral`           | SATISFIED — two variants                                                       |
| `standing-conversational`    | SATISFIED — two variants                                                       |
| `seated-guest-neutral`       | SATISFIED — four cells                                                         |
| `standing-listening`         | PARTIAL — nothing shows settled weight and stilled hands distinct from neutral |
| `seated-at-desk`             | PARTIAL — no cell puts forearms at a work surface                              |
| `standing-podium-or-lectern` | MISSING — no cell stands at a lectern                                          |

Pack 74 **B1** requests exactly those three, from the existing sheet, so the
family that survived the salvage also becomes pose-complete. The existing
feminine heavy family is **not** promoted to universal body authority; it remains
one cell of a nine-cell matrix.

---

## 6. Cross-morphology wearable reuse — the conclusion

Full evidence in 76A section 5. The conclusion, and the one thing that changed
the recommendation:

**The existing proof that sharing works is circular.** Every wearable declares
both adult body families, `dev-g2-broad` and `dev-g2-slim` — but those two
families have **identical canvases (420×840 / 420×660) and identical anchors
(head 0.12, torso 0.16, hips 0.54, feet 0.955)**. The compositor's entire math is
`width = component.canvas.width / body.canvas.width` plus a translate — no
rotation, no warp, no mask, no per-recipe transform — so for two families that
share a canvas it computes the same rectangle twice. It is not adapting anything.

Meanwhile the painted silhouettes differ by 15–21% (torso rows 254 vs 210 px;
hips rows 326 vs 282 px; widest rows 328 vs 284 px), and real body rasters do not
share a canvas at all: 817–908 px across eight poses of a _single_ family, an
11.1% spread before morphology is varied.

Composing each garment onto each family with the real placement math and
measuring how far it hangs past the body:

| Component         | On broad | On slim | Ratio    |
| ----------------- | -------- | ------- | -------- |
| Olive knit top    | 7 px     | 29 px   | **4.1×** |
| Slate trousers    | 4 px     | 20 px   | **5.0×** |
| Derby footwear    | 105 px   | 105 px  | 1.0×     |
| Lanyard accessory | 0 px     | 0 px    | 1.0×     |
| Head              | 102 px   | 102 px  | 1.0×     |

| Category                              | Verdict                                                               |
| ------------------------------------- | --------------------------------------------------------------------- |
| Footwear (strip below the ankle line) | **SAFE TO SHARE ACROSS MORPHOLOGIES**                                 |
| Accessories (small, torso-anchored)   | **SAFE TO SHARE ACROSS MORPHOLOGIES**                                 |
| Heads, hair, eyewear                  | **SAFE TO SHARE ACROSS MORPHOLOGIES**                                 |
| Tops                                  | **SAFE ONLY WITHIN A BODY FAMILY**                                    |
| Bottoms                               | **SAFE ONLY WITHIN A BODY FAMILY**                                    |
| Outerwear (none authored yet)         | **SAFE ONLY WITHIN A BODY FAMILY** — author per family from the start |

_SAFE WITH ANCHOR/AFFINE TRANSFORM_ is deliberately empty: a non-uniform scale is
expressible, but it is **not addressable per body family**, because it is derived
from the component's own canvas and the two adult families share one. There is
nowhere to put a per-family number, so anything needing a different fit per
family is _POSSIBLE ONLY WITH A CONTRACT CHANGE_. The cheaper answer today is a
per-family variant of the art, which is what pack 74 B3 and B4 ask for.

**No runtime generative AI is proposed anywhere in this conclusion.**

### The footwear question, answered directly

_Can the existing shoe source be adapted to front-on orientation?_ **No.** The
twelve p71 sheets are bonded three-quarter pairs at 1164–1208 × 739–1060; the
contract expects a front-on strip at 400×60 / 420×64. The gap is **viewpoint**,
not size — turning a three-quarter shoe front-on means revealing the toe box
front, the inner sidewall and the pair's true symmetry, geometry the source does
not contain. No affine transform produces unseen geometry, and the compositor has
no warp to attempt it with.

So **B2 is the one justified wearable regeneration in this entire run.** The
existing three-quarter sheets are kept, not discarded: they are valid source for
a future three-quarter pose family.

---

## 7. Scene bank reconciliation

Reconciled against the existing research (18B, 18C, 18F, 18J, 60B, 68B and Packet 73) rather than re-requested. Nine environment rasters measured; the house canvas
is confirmed as **5504×3072 (43:24)**, which six of nine masters already are, and
which every new scene prompt asks for.

**Already solved — the pack says do not regenerate these:** legislative chamber
floor, civic hearing room, shared workroom office, apartment living (canonical,
ordinary, starter), community meeting hall title tableau — all released; courtroom
(empty) and executive private office — banked and deliberately unreleased.

**Requested because they are genuinely missing:** the classroom, as a _surgical
edit_ of the existing candidate rather than a fresh generation; four more
ordinary-life rooms; five campaign rooms; ten future political-life rooms.

### The one thing this run could not do

The five Drive-root uploads — `IMG_5202`, `IMG_5203`, `IMG_5204`, `IMG_5205`,
`IMG_5207` — **could not be pixel-inspected in this environment.** The proxy
refuses `drive.google.com` (`CONNECT tunnel failed, response 403`); the Drive read
tool returns empty content for `image/jpeg`; and `IMG_5205` alone is 3,068,039
bytes, far past what can pass through a message as base64.

**No intake verdict is claimed for them.** Prompt pack items E1–E3 are therefore
_held_ rather than answered with speculative replacements — the pack carries a
fill-in-the-blanks surgical-edit template so that whoever can see the pixels can
complete the prompt in a minute without guessing at the rest. Generating
replacements for images nobody has looked at would have been the wrong kind of
productivity.

---

## 8. UI direction

Recorded in 76A section 7 and deliberately **not** implemented as raster art.

- Player-facing branding is **Our Civic Duty**. "Political Game" is a repository
  path, not a thing a player reads.
- **Buttons, menus, tabs, focus rings and icons stay CSS and SVG.** No raster
  button art was generated, and the pack says so explicitly in its closing
  section. A raster control has no focus state, no forced-colours response, no
  text scaling, no accessible name, and it bakes labels that change with life
  stage and pronouns.
- The flat dark-green prototype control language is rejected as a _CSS_
  direction: every state (rest, hover, active, focus-visible, disabled, selected)
  must differ in more than one channel, so state is legible without colour
  discrimination. The civic palette stays; the uniform slab goes.
- **PR #87's shell was not rebuilt.** It was read, and left alone.

---

## 9. Validation

| Check                                                                                      | Result                                                                                        |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `npm run validate` (format, lint, typecheck, unit tests, build, demo seed, `validate:art`) | PASS                                                                                          |
| `tests/edge-despill.test.ts`                                                               | 5/5 PASS                                                                                      |
| `npm run inventory:art`                                                                    | PASS — 176 items, the eight repaired rasters registered                                       |
| `npm run qa:art`                                                                           | PASS — the eight report `hasTransparency: confirmed`, no failures                             |
| `npm run inventory:asset-bank`                                                             | PASS — 8 released environment plates, 9 released component kinds, 28 masters, 6 pose families |
| `git diff --check`                                                                         | clean                                                                                         |
| Playwright end-to-end                                                                      | **117/117 PASS** — see the note below                                                         |

**The Playwright note, because the command in `package.json` does not work in
this container as written.** `playwright.config.ts` selects Google Chrome
(`channel: "chrome"`) outside CI, and this image has no Google Chrome; with
`CI=1` it falls through to the bundled browser, and the image ships Chromium
build **1194** while the pinned `@playwright/test` 1.62.1 expects **1234**. Both
paths fail at launch, and neither failure is a test failure — nothing had run
yet.

The suite was therefore run against the browser the container actually has, via
a config kept **outside the repository** that changes only `executablePath`
(`/opt/pw-browsers/chromium`) and leaves `testDir`, the web server and every
`use` option identical. **117 passed in 4.5 minutes.** No scratch config was
committed. The two evidence screenshots the suite rewrites
(`docs/agent/evidence/pose-proof-*.png`) were restored rather than committed,
since their only change was the different Chromium build's rendering and no code
in `src/` moved this run.

## 10. What Claude ingests next

In order, as sheets come back:

1. **Wave A sheets** — chop each 4×2 sheet into eight pose rasters, measure every
   one (`npm run measure:references`), despill only if the intake metric says so
   (`npm run despill:edges`), and propose D-068 anchors from the shipping raster
   for human review. The anchor recommendations this run produced are labelled
   _STARTING POINT ONLY_ for exactly that reason.
2. **B2 footwear** — chop to front-on strips against the 400×60 / 420×64 contract
   and register the first wearable family that is measurably fitted rather than
   tolerated.
3. **B3 / B4 wearables** — one morphology at a time, per the section 6 verdict,
   with the per-family overhang measured rather than assumed.
4. **C1 / C2** — check the 6-heads and 7-heads proportion criteria before anything
   else; an adult-proportioned child sheet is a fail regardless of quality.
5. **The five Drive-root uploads**, the moment they can be reached as pixels —
   then E1–E3 unlock.
6. **Scene plates** — register, then author standing and seated anchors by hand.
   The measurement tool leaves those `UNKNOWN` on purpose and will keep doing so.

---

## 11. Status

- Branch `claude/post86-mass-visual-generation-command-center`, cut from accepted
  main `5f735da`, pushed with a **draft** pull request, left **unmerged**.
- PR #86 not touched. PR #87 not touched.
- Three documents delivered: `74_GEMINI_VISUAL_GENERATION_AND_REVISION_ONE_STOP_PROMPT_PACK`,
  `76A_VISUAL_REFERENCE_MEASUREMENT_AND_GENERATION_SPEC`, and this report.
- No further audit requested. No polling. No loop.

**Lamontae's next action: attach the feminine 8-pose reference sheet and say
`Run prompt A1`.**

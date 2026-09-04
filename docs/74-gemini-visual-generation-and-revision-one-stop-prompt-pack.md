# 74 — GEMINI VISUAL GENERATION AND REVISION — ONE-STOP PROMPT PACK

**Attach the exact reference image(s) named by the task and say: `Run prompt N`.**

If a prompt says `NO REFERENCE`, attach nothing and just say `Run prompt N`.

Built against accepted main `5f735da209c59647e4b877717a40fe6cc045fc24` (the
merge of PR #86). Every measurement quoted below was read off the actual raster
by `npm run measure:references` and is stored in
`art/qa/p76/reference_measurements.json`; every measurement carries a confidence
in that file, and where a number here is an estimate it says so.

---

## HOW TO USE THIS

1. Find the prompt number in the run order below.
2. Attach exactly the file(s) the prompt names.
3. Say `Run prompt N`.
4. Upload the result to the folder the prompt names, with the filename it gives.
5. Do the upscale / background-removal steps only where the prompt says to.
6. Tell Claude which prompt numbers came back; the ones marked
   **Claude processes after return** need a chop or an intake run.

**Two standing rules for every prompt in this pack.**

**No baked readable text, anywhere.** No seals, no bill numbers, no vote
tallies, no names on nameplates, no agenda sheets, no signage copy, no
whiteboard writing, no screen content. Those are things the game's world owns
and draws at runtime; baking one draws a government that does not exist. Blank
surfaces are wanted and are not a defect.

**No impossible furniture.** Every chair belongs to one frame with the right
number of legs, no two chairs share a leg, nothing intersects a table it is
pushed under, and seat heights match within a row. This is the single most
common failure in this project's generated rooms and it is on every acceptance
checklist below.

---

## MASS GENERATION RUN ORDER

| Wave  | What                             | Can run in parallel                                        | Blocked by                            |
| ----- | -------------------------------- | ---------------------------------------------------------- | ------------------------------------- |
| **A** | Body / morphology authorities    | A1–A6 all independent                                      | nothing                               |
| **B** | Poses, footwear, wearables       | B1 independent; B2 independent; B3–B4 need a Wave A result | B3/B4 need A1                         |
| **C** | Child / adolescent bodies        | C1, C2 independent                                         | nothing                               |
| **D** | Ordinary-life scenes             | all independent                                            | nothing                               |
| **E** | Campaign / political scenes      | E4–E8 independent; E1–E3 are intake-first                  | E1–E3 wait on Claude's intake verdict |
| **F** | Future political-life scene bank | all independent                                            | nothing                               |
| **G** | Props / expressions              | G1 is Claude-side; G2–G3 independent                       | nothing                               |

**Start here if you want the most value fastest:** A1, A2, A3, A4, A5 (five
body sheets, all parallel), then C1 and C2. Nothing in the game can put a person
in a room until a body family is released, and that is the only P0 left.

**Waves D, E and F can be generated at any time in parallel with A** — scenes
and bodies do not depend on each other.

---

## WHERE THINGS GO

| Kind                       | Drive folder                               |
| -------------------------- | ------------------------------------------ |
| Body / pose sheets         | `4K source masters / people-pose`          |
| Head / expression sheets   | `4K source masters / body-head`            |
| Wardrobe & footwear sheets | `4K source masters / wardrobe`             |
| Scene masters              | `4K source masters / scene-environment`    |
| Prop sheets                | `4K source masters / props`                |
| Anything superseded        | leave in place; do not delete — provenance |

Filenames follow the pattern already in the bank:
`OCD_CANDIDATE_<KIND>_<SUBJECT>_<WIDTH>x<HEIGHT>_01.png`

---

## WHAT IS ALREADY SOLVED — DO NOT REGENERATE

| Asset                                            | State                                                                                                                               |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Legislative chamber floor                        | ACCEPTED, RELEASED, registered                                                                                                      |
| Civic hearing room                               | RELEASED, registered                                                                                                                |
| Shared workroom office                           | RELEASED, registered                                                                                                                |
| Apartment living — canonical, ordinary, starter  | RELEASED, registered                                                                                                                |
| Courtroom (empty)                                | Banked, deliberately unreleased                                                                                                     |
| Executive private office                         | Banked, deliberately unreleased                                                                                                     |
| Community meeting hall (title tableau)           | RELEASED                                                                                                                            |
| **Adult feminine heavy/high-mass body, 8 poses** | **SALVAGED — green fringe 66.8–79.8% → 0.00% by deterministic despill, alpha and interior byte-identical. No regeneration needed.** |
| 12 adult heads                                   | PASS as chopped components                                                                                                          |

---

# WAVE A — BODY / MORPHOLOGY AUTHORITIES

**Why this wave is first.** The game currently has no released production body,
so no person can be composed into any of the seven released rooms. That is the
only P0 in the project. It also has exactly one body family — an adult feminine
heavy/high-mass build — and that family must not become the universal human
authority. Five more morphology authorities close both problems at once.

**Measured facts every Wave A prompt inherits**, from the existing family:

- Sheet: `5056 x 3392`, 8 cells in a 4 x 2 grid.
- Chopped cell canvases: `817–908 px` wide by `1603–1728 px` tall.
- Standing figures measure **6.65–7.16 heads tall**; seated **5.73–5.92**.
- Figure box sits with a 64 px transparent margin on every side.
- Interior alpha is fully opaque; the edge is antialiased.

**These are the eight poses, in cell order, for every Wave A sheet:**

```
  R1C1 standing-neutral          R1C2 standing-conversational
  R1C3 standing-listening        R1C4 standing-podium-or-lectern
  R2C1 seated-guest-neutral      R2C2 seated-at-desk
  R2C3 seated-conversational     R2C4 standing-neutral-three-quarter
```

That grid is deliberately different from the existing family's, which delivered
four seated variants and no lectern. `standing-listening`,
`seated-at-desk` and `standing-podium-or-lectern` are the three poses the
project is actually short of, and every new sheet supplies all three.

---

### PROMPT A1 — Masculine, ordinary/average build — 8-pose sheet

- **Status:** GENERATE
- **Reference to attach:** `OCD_CANDIDATE_PEOPLE_POSE_ADULT_FEMININE_BODY_FAMILY_8POSE_5056x3392_01.png` (Drive `11PQk8jyZM7xta3ZFexiGiiN3HC21IyMl`) — **as a style and layout authority only.** The body must not resemble it in build.
- **For:** The first masculine body authority. Consumer: every scene anchor in the seven released rooms; `character-components.ts` body family.
- **Target:** 5056 x 3392 PNG, transparent background, 4 x 2 grid.
- **Transparency:** REQUIRED.
- **Whole sheet:** YES — one sheet keeps the same person consistent across all eight poses, which is the whole reason for sheet generation.
- **Morphology, and this is the part that matters:** an ordinary adult male build. Not athletic. Not a V-taper. Shoulders modestly wider than hips, a soft midsection, unremarkable arms. The reference point is a man who works in an office and walks to the bus, not a man who trains. **Athleticism is the default failure mode of this generation and it must be refused.**

> **PASTE THIS INTO GEMINI:**
>
> Create a character reference sheet on a fully transparent background: one adult man, drawn eight times in eight different poses, arranged in a 4-column by 2-row grid on a 5056 by 3392 canvas.
>
> It must be the same man in every cell — same face, same hair, same skin tone, same clothing, same proportions. Consistency across the eight cells is the single most important requirement.
>
> His build is ordinary and average. He is not athletic, not muscular, not broad-shouldered, and not a heroic figure. His shoulders are only slightly wider than his hips, his midsection is soft, and his arms are unremarkable. Draw a man of about forty who has a desk job. Do not idealise him.
>
> He is about 7 heads tall standing. He wears plain everyday clothes — a long-sleeved shirt and ordinary trousers and plain shoes. Nothing branded, nothing with readable text, no logos, no lanyard, no badge.
>
> The eight poses, in reading order:
> Row 1: (1) standing straight, arms relaxed at his sides, facing the viewer, feet slightly apart. (2) standing, turned about a quarter to the side, one hand open in a small explaining gesture at chest height, mid-conversation. (3) standing still and attentive, listening to someone off-camera, weight settled evenly, hands quiet at his sides or loosely clasped in front. (4) standing behind and slightly back from a lectern, both hands resting on its top edge, facing the viewer. Draw only enough of the lectern for his hands to rest on — no more than a suggestion of its top surface.
> Row 2: (5) sitting upright on a plain chair, facing the viewer, hands resting on his thighs, feet flat on the floor. (6) sitting at a desk, forearms resting on the desk surface in front of him, leaning very slightly forward. Draw only the near edge of the desk surface. (7) sitting turned about a quarter to the side, one hand gesturing lightly, mid-conversation. (8) standing straight, turned about a quarter to the side, arms relaxed.
>
> Draw each figure complete from the crown of the head to the soles of the feet, with clear empty transparent space around each one. Do not crop any limb at a cell boundary. Do not draw cell borders, grid lines, labels, numbers, captions, shadows on the ground, or any background of any kind. The background must be fully transparent everywhere.
>
> Flat, clean illustration style with soft cel shading and clear outlines — the style of a modern narrative game, not photorealism and not a technical diagram.

- **Acceptance checklist:**
  - [ ] 8 complete figures, no limb cropped at a cell edge.
  - [ ] Recognisably the same man in all 8 cells.
  - [ ] Build reads as ordinary, **not** athletic — check the shoulder-to-hip ratio and the midsection specifically.
  - [ ] Cell 4 shows hands on a lectern edge; cell 6 shows forearms on a desk edge.
  - [ ] Fully transparent background — no white, no colour, no ground shadow.
  - [ ] No text, no logos, no cell borders, no labels.
- **After it returns:** upload to `people-pose` as `OCD_CANDIDATE_PEOPLE_POSE_ADULT_MASC_AVERAGE_8POSE_5056x3392_01.png`. **Upscale:** only if it comes back under 5056 px wide. **Remove background:** no — it should already be transparent; if it is not, that is a failure, re-run. **Claude processes after return:** YES — chop, measure, despill if needed, and propose D-068 anchors.

---

### PROMPT A2 — Masculine, lean/narrow build — 8-pose sheet

- **Status:** GENERATE
- **Reference to attach:** the returned **A1 sheet**, once you have it — so the drawing style and the eight poses match. If A1 is not back yet, attach `OCD_CANDIDATE_PEOPLE_POSE_ADULT_FEMININE_BODY_FAMILY_8POSE_5056x3392_01.png` instead and run it in parallel.
- **For:** masculine lean/narrow morphology authority.
- **Target:** 5056 x 3392 PNG, transparent, 4 x 2 grid, same eight poses as A1.

> **PASTE THIS INTO GEMINI:**
>
> Create a character reference sheet on a fully transparent background: one adult man, drawn eight times in eight poses, in a 4-column by 2-row grid on a 5056 by 3392 canvas. Match the drawing style, the line weight, the shading and the eight poses of the attached sheet exactly. It must be the same man in all eight cells.
>
> This man is a different person from the one in the attached sheet, and his build is the point: he is lean and narrow. Narrow shoulders, narrow hips, slight through the chest and arms, no visible muscle definition, long limbs relative to his torso. He is thin in the way an ordinary thin person is thin — not gaunt, not sculpted, not athletic. He is about 7 and a half heads tall standing.
>
> He wears plain everyday clothes with nothing branded and no readable text of any kind.
>
> The eight poses, in reading order:
> Row 1: (1) standing straight, arms at sides, facing viewer. (2) standing, quarter turn, one hand in a small explaining gesture. (3) standing still and attentive, listening, hands quiet. (4) standing at a lectern with both hands on its top edge — draw only a suggestion of the lectern top.
> Row 2: (5) sitting upright on a plain chair facing viewer, hands on thighs. (6) sitting at a desk, forearms on the desk surface — draw only the near desk edge. (7) sitting, quarter turn, one hand gesturing. (8) standing straight, quarter turn, arms relaxed.
>
> Each figure complete from crown to soles, clear transparent space around each, no limb cropped at a cell boundary. No cell borders, no grid lines, no labels, no numbers, no captions, no ground shadows, no background. Fully transparent everywhere.

- **Acceptance checklist:**
  - [ ] Build reads as clearly narrower than A1 side by side — this is the whole point of the cell.
  - [ ] Same style and poses as the attached reference.
  - [ ] 8 complete figures, same man throughout.
  - [ ] Transparent, no text, no borders.
- **After it returns:** `people-pose` as `OCD_CANDIDATE_PEOPLE_POSE_ADULT_MASC_LEAN_8POSE_5056x3392_01.png`. Claude processes after return: YES.

---

### PROMPT A3 — Masculine, heavy/high-mass build — 8-pose sheet

- **Status:** GENERATE
- **Reference to attach:** the returned **A1 sheet** (or the feminine sheet if A1 is not back).
- **For:** masculine heavy/high-mass morphology authority.
- **Target:** 5056 x 3392 PNG, transparent, 4 x 2 grid, same eight poses.

> **PASTE THIS INTO GEMINI:**
>
> Create a character reference sheet on a fully transparent background: one adult man, drawn eight times in eight poses, in a 4-column by 2-row grid on a 5056 by 3392 canvas. Match the drawing style, line weight, shading and the eight poses of the attached sheet exactly. The same man in all eight cells.
>
> This man is heavy. He carries substantial weight through his midsection, chest and upper arms; his waist is wider than his shoulders; his neck is short and thick; his thighs are heavy and his stance is correspondingly wider. He is not merely "big-boned" or "stocky" or a large muscular man — he is a genuinely heavy man, and his mass must be visible in every one of the eight poses, including the seated ones where his weight settles and spreads. He is about 6 and three-quarter heads tall standing.
>
> Draw him with the same respect as any other figure: ordinary posture, ordinary clothes that fit him, no comic exaggeration, no shame in the posing.
>
> He wears plain everyday clothes — a long-sleeved shirt and ordinary trousers — nothing branded, no readable text.
>
> The eight poses, in reading order:
> Row 1: (1) standing straight, arms at sides, facing viewer. (2) standing, quarter turn, one hand in a small explaining gesture. (3) standing still and attentive, listening, hands quiet. (4) standing at a lectern with both hands on its top edge — only a suggestion of the lectern top.
> Row 2: (5) sitting upright on a plain chair facing viewer, hands on thighs. (6) sitting at a desk, forearms on the desk surface — only the near desk edge. (7) sitting, quarter turn, one hand gesturing. (8) standing straight, quarter turn, arms relaxed.
>
> Each figure complete crown to soles, clear transparent space around each, no limb cropped at a cell boundary. No cell borders, grid lines, labels, numbers, captions, ground shadows or background. Fully transparent everywhere.

- **Acceptance checklist:**
  - [ ] Reads as materially heavier than A1, not merely larger — check the waist-to-shoulder relationship.
  - [ ] The seated poses show weight settling; he is not a standing figure with bent knees.
  - [ ] Clothing fits him; it is not stretched as a joke.
  - [ ] 8 complete figures, same man, transparent, no text.
- **After it returns:** `people-pose` as `OCD_CANDIDATE_PEOPLE_POSE_ADULT_MASC_HEAVY_8POSE_5056x3392_01.png`. Claude processes after return: YES.

---

### PROMPT A4 — Feminine, lean/narrow build — 8-pose sheet

- **Status:** GENERATE
- **Reference to attach:** `OCD_CANDIDATE_PEOPLE_POSE_ADULT_FEMININE_BODY_FAMILY_8POSE_5056x3392_01.png` (Drive `11PQk8jyZM7xta3ZFexiGiiN3HC21IyMl`) for style; the woman drawn must be a different build.
- **For:** feminine lean/narrow morphology authority.
- **Target:** 5056 x 3392 PNG, transparent, 4 x 2 grid.

> **PASTE THIS INTO GEMINI:**
>
> Create a character reference sheet on a fully transparent background: one adult woman, drawn eight times in eight poses, in a 4-column by 2-row grid on a 5056 by 3392 canvas. Match the drawing style, line weight and shading of the attached sheet. The same woman in all eight cells.
>
> Her build is lean and narrow — slight through the shoulders, chest, waist and hips, with long limbs. Her waist is not dramatically narrower than her hips: do not draw an hourglass. She is a thin woman with a fairly straight silhouette, which is an ordinary way for a woman to be built. She is about 7 and a half heads tall standing.
>
> She wears plain everyday clothes — a long-sleeved top and ordinary trousers and flat shoes. Nothing branded, no readable text, no jewellery that reads as a specific object.
>
> The eight poses, in reading order:
> Row 1: (1) standing straight, arms at sides, facing viewer. (2) standing, quarter turn, one hand in a small explaining gesture. (3) standing still and attentive, listening, hands quiet. (4) standing at a lectern with both hands on its top edge — only a suggestion of the lectern top.
> Row 2: (5) sitting upright on a plain chair facing viewer, hands on thighs. (6) sitting at a desk, forearms on the desk surface — only the near desk edge. (7) sitting, quarter turn, one hand gesturing. (8) standing straight, quarter turn, arms relaxed.
>
> Each figure complete crown to soles, clear transparent space around each, no limb cropped at a cell boundary. No cell borders, grid lines, labels, numbers, captions, ground shadows or background. Fully transparent everywhere.

- **Acceptance checklist:**
  - [ ] Silhouette reads straight and slight, **not** hourglass.
  - [ ] Clearly a different build from the existing heavy feminine family.
  - [ ] 8 complete figures, same woman, transparent, no text.
- **After it returns:** `people-pose` as `OCD_CANDIDATE_PEOPLE_POSE_ADULT_FEM_LEAN_8POSE_5056x3392_01.png`. Claude processes after return: YES.

---

### PROMPT A5 — Feminine, ordinary/average build — 8-pose sheet

- **Status:** GENERATE
- **Reference to attach:** `OCD_CANDIDATE_PEOPLE_POSE_ADULT_FEMININE_BODY_FAMILY_8POSE_5056x3392_01.png`.
- **For:** feminine ordinary/average morphology authority — the middle cell between the existing heavy family and A4.
- **Target:** 5056 x 3392 PNG, transparent, 4 x 2 grid.

> **PASTE THIS INTO GEMINI:**
>
> Create a character reference sheet on a fully transparent background: one adult woman, drawn eight times in eight poses, in a 4-column by 2-row grid on a 5056 by 3392 canvas. Match the drawing style, line weight and shading of the attached sheet. The same woman in all eight cells.
>
> Her build is ordinary and average — neither thin nor heavy. A soft, unremarkable middle, hips a little wider than her shoulders, a body that reads as a woman in her thirties or forties who is not thinking about her build. Do not draw an hourglass and do not draw a fashion figure. She is about 7 heads tall standing.
>
> She wears plain everyday clothes — a long-sleeved top and ordinary trousers and flat shoes. Nothing branded, no readable text.
>
> The eight poses, in reading order:
> Row 1: (1) standing straight, arms at sides, facing viewer. (2) standing, quarter turn, one hand in a small explaining gesture. (3) standing still and attentive, listening, hands quiet. (4) standing at a lectern with both hands on its top edge — only a suggestion of the lectern top.
> Row 2: (5) sitting upright on a plain chair facing viewer, hands on thighs. (6) sitting at a desk, forearms on the desk surface — only the near desk edge. (7) sitting, quarter turn, one hand gesturing. (8) standing straight, quarter turn, arms relaxed.
>
> Each figure complete crown to soles, clear transparent space around each, no limb cropped at a cell boundary. No cell borders, grid lines, labels, numbers, captions, ground shadows or background. Fully transparent everywhere.

- **Acceptance checklist:**
  - [ ] Reads as a middle build — visibly between A4 and the existing heavy family.
  - [ ] Not an hourglass, not a fashion figure.
  - [ ] 8 complete figures, same woman, transparent, no text.
- **After it returns:** `people-pose` as `OCD_CANDIDATE_PEOPLE_POSE_ADULT_FEM_AVERAGE_8POSE_5056x3392_01.png`. Claude processes after return: YES.

---

### PROMPT A6 — Older adult — 8-pose sheet

- **Status:** GENERATE
- **Reference to attach:** the returned **A1 sheet** for style.
- **For:** an older-adult morphology authority. Requested because age changes body structure — stance, shoulder carriage and spine — in ways a younger body cannot be recoloured into. One sheet, not two: the sex-linked distinction at this age is carried adequately by the head and wardrobe layers.
- **Target:** 5056 x 3392 PNG, transparent, 4 x 2 grid.

> **PASTE THIS INTO GEMINI:**
>
> Create a character reference sheet on a fully transparent background: one older adult, a woman of about seventy, drawn eight times in eight poses, in a 4-column by 2-row grid on a 5056 by 3392 canvas. Match the drawing style, line weight and shading of the attached sheet. The same person in all eight cells.
>
> Her body reads as an older body, and the difference is structural rather than cosmetic: a slight forward carriage of the head and shoulders, a softer and rounder upper back, thinner forearms and lower legs, a thicker middle, and a slightly narrower stance. She stands and sits like someone who is careful about it. She is about 6 and a half heads tall standing — a little shorter than she once was, which is true of older people.
>
> Do not draw her as frail, comic, or as an illustration of decline. She is an ordinary older woman.
>
> She wears plain everyday clothes — a long-sleeved top, ordinary trousers, flat comfortable shoes. Nothing branded, no readable text.
>
> The eight poses, in reading order:
> Row 1: (1) standing straight, arms at sides, facing viewer. (2) standing, quarter turn, one hand in a small explaining gesture. (3) standing still and attentive, listening, hands quiet. (4) standing at a lectern with both hands on its top edge — only a suggestion of the lectern top.
> Row 2: (5) sitting upright on a plain chair facing viewer, hands on thighs. (6) sitting at a desk, forearms on the desk surface — only the near desk edge. (7) sitting, quarter turn, one hand gesturing. (8) standing straight, quarter turn, arms relaxed.
>
> Each figure complete crown to soles, clear transparent space around each, no limb cropped at a cell boundary. No cell borders, grid lines, labels, numbers, captions, ground shadows or background. Fully transparent everywhere.

- **Acceptance checklist:**
  - [ ] Age reads in the posture and proportions, not only in the face and hair.
  - [ ] Not frail, not comic.
  - [ ] 8 complete figures, same person, transparent, no text.
- **After it returns:** `people-pose` as `OCD_CANDIDATE_PEOPLE_POSE_OLDER_ADULT_8POSE_5056x3392_01.png`. Claude processes after return: YES.

---

# WAVE B — POSES, FOOTWEAR AND WEARABLES

### PROMPT B1 — The three missing poses for the existing feminine heavy family

- **Status:** GENERATE (a new sheet in the same identity, not an edit)
- **Reference to attach:** `OCD_CANDIDATE_PEOPLE_POSE_ADULT_FEMININE_BODY_FAMILY_8POSE_5056x3392_01.png` (Drive `11PQk8jyZM7xta3ZFexiGiiN3HC21IyMl`)
- **For:** completing the one body family the project already has. Its eight cells give two standing-neutral, two standing-conversational and four seated-guest variants, and are missing `standing-listening`, `seated-at-desk` and `standing-podium-or-lectern` entirely. That last one is the pose the whole legislative chamber needs.
- **Target:** 3 cells in a 3 x 1 grid, 1896 x 1696 PNG, transparent.

> **PASTE THIS INTO GEMINI:**
>
> The attached image is a character reference sheet of one adult woman drawn in eight poses. Study her carefully: her face, her hair, her skin tone, her clothing, her exact body build and proportions, and the drawing style.
>
> Now create a NEW sheet on a fully transparent background showing THE SAME WOMAN — identical face, identical hair, identical clothing, identical build — in three NEW poses she is not already drawn in, arranged left to right in a single row of three cells on a 1896 by 1696 canvas.
>
> She is a heavy woman with substantial mass through her torso and thighs, and she must remain exactly that in all three new poses. Do not slim her. Do not change her clothes. Do not change her face or hair.
>
> The three new poses:
> (1) Standing still and attentive, listening to someone off-camera. Her weight is settled evenly on both feet, her hands are quiet — either at her sides or loosely clasped in front of her. This must read as different from simply standing: she is paying attention to someone.
> (2) Sitting at a desk, facing the viewer, with both forearms resting on the desk surface in front of her and her body leaning very slightly forward. Draw only the near edge of the desk surface — just enough for her forearms to rest on, nothing more.
> (3) Standing behind a lectern, both hands resting on its top edge, facing the viewer as though about to speak. Draw only the top edge and a suggestion of the front face of the lectern, nothing more — no microphone, no papers, no seal, no text of any kind on it.
>
> Each figure complete from the crown of her head to the soles of her feet, with clear empty transparent space around each. Do not crop any limb at a cell boundary. No cell borders, no grid lines, no labels, no numbers, no captions, no ground shadows, no background of any kind. Fully transparent everywhere.

- **Acceptance checklist:**
  - [ ] Unmistakably the same woman as in the attached sheet — face, hair, clothes, build.
  - [ ] She is still heavy in all three poses.
  - [ ] Pose 1 reads as _listening_, distinct from standing neutral.
  - [ ] Pose 2 has forearms on a desk edge and nothing else of the desk.
  - [ ] Pose 3 has hands on a lectern with **no text, no seal, no microphone**.
  - [ ] Transparent background, no borders, no labels.
- **After it returns:** `people-pose` as `OCD_CANDIDATE_PEOPLE_POSE_ADULT_FEM_HEAVY_3POSE_ADDENDUM_1896x1696_01.png`. Claude processes after return: YES — chop and despill.

---

### PROMPT B2 — Footwear, front-on, twelve pairs — replaces the current sheet

- **Status:** GENERATE (a re-render, not an edit — see why below)
- **Reference to attach:** `OCD_CANDIDATE_WARDROBE_FOOTWEAR_SOURCE_12UP_3584x4800_01.png` (Drive `1jBk1vKalYhSTXn2VE0S-7RISCuw7M0jW`)
- **For:** the footwear layer of the modular character system.
- **Why a re-render and not a transform.** The existing twelve pairs are drawn well and chop cleanly with true alpha and no fringe. They are unusable anyway: each pair is bonded into a single three-quarter product view with the two shoes overlapping, while every body in the bank stands front-on with the feet separated and the toes toward the camera. Turning a three-quarter view into a front-on view is a change of viewpoint, which reveals surfaces the source image does not contain. No affine transform, warp or remap can invent them. This is the one case in this pack where regeneration is genuinely unavoidable rather than merely easier.
- **Target:** 3584 x 4800 PNG, transparent, 3 columns x 4 rows.

> **PASTE THIS INTO GEMINI:**
>
> The attached image shows twelve pairs of shoes drawn as three-quarter product views with the two shoes of each pair overlapping.
>
> Create a NEW sheet on a fully transparent background showing THE SAME TWELVE PAIRS of shoes — same styles, same colours, same materials, same drawing style — but redrawn from a completely different viewpoint, arranged in a 3-column by 4-row grid on a 3584 by 4800 canvas, in the same order as the attached sheet.
>
> The new viewpoint, and this is the entire point of the task: each pair must be drawn STRAIGHT ON FROM THE FRONT, as if you are standing directly in front of someone and looking at their feet at floor level. The two shoes of each pair must be SEPARATED with a gap between them, positioned as a person's feet are when they stand naturally — roughly hip width apart. Both shoes point directly toward the viewer, so you see the toe of each shoe face-on. You should see almost none of the side of either shoe and none of the sole.
>
> Both shoes of a pair sit level with each other on the same invisible floor line, and that floor line must be at the same height for all twelve pairs.
>
> Do not draw a floor, a shadow, a background, a base, a platform, a label, a number, a caption, or a cell border. The background must be fully transparent everywhere, including between the two shoes of each pair.

- **Acceptance checklist:**
  - [ ] All twelve pairs are front-on, toes toward the viewer.
  - [ ] The two shoes of each pair are **separated**, not overlapping or bonded.
  - [ ] Both shoes of a pair sit level; the floor line is consistent across all twelve.
  - [ ] Styles and colours match the attached sheet pair for pair.
  - [ ] Fully transparent, including the gap between each pair's shoes.
  - [ ] No shadows, no base, no labels, no borders.
- **After it returns:** `wardrobe` as `OCD_CANDIDATE_WARDROBE_FOOTWEAR_FRONT_ON_12UP_3584x4800_01.png`. Claude processes after return: YES — chop, and measure the foot-contact edge.

---

### PROMPT B3 — Tops, twelve, for one morphology

- **Status:** GENERATE
- **Reference to attach:** the returned **A1 sheet** (masculine average). Run this once per morphology you want covered — see the note below.
- **For:** the `top` layer. **Read this before running it:** the current compositor applies no scale to a worn component; a garment renders at the ratio of its own canvas to the body's canvas and nothing else. The eight poses of the one existing body family already vary 11.1% in canvas width, so one garment raster is already 11% wrong across poses of a single body. Sharing a top across morphologies is worse. Until the compositor gains a fit transform, **tops are morphology-specific art**, which is why this prompt names its morphology.
- **Target:** 3584 x 4800 PNG, transparent, 3 x 4 grid.

> **PASTE THIS INTO GEMINI:**
>
> The attached sheet shows one adult man in eight poses. Study his exact build and the drawing style.
>
> Create a NEW sheet on a fully transparent background: twelve different upper-body garments, drawn as they would look worn by THIS EXACT MAN standing straight and facing the viewer, arranged in a 3-column by 4-row grid on a 3584 by 4800 canvas.
>
> Draw only the garment itself — the fabric, the sleeves, the collar, the buttons. Do not draw his head, his neck, his hands, his legs or any part of his body. Draw each garment as if the man were inside it and then removed, so the garment holds his exact shape and size: the shoulder width, the chest width and the waist width must all match his build precisely, because these will be layered onto that body.
>
> Each garment ends at the same place: the shoulder seam at the top and the hem at the hip at the bottom. The sleeves end at the wrist.
>
> The twelve garments: (1) plain crew-neck t-shirt, (2) long-sleeved button shirt, (3) knitted pullover sweater, (4) structured blazer, (5) zip-up hooded sweatshirt, (6) polo shirt, (7) open flannel shirt over a plain t-shirt, (8) work shirt with two chest pockets, (9) light rain jacket, (10) cardigan, (11) sleeveless vest over a long-sleeved shirt, (12) heavy winter coat.
>
> Use plain, muted, ordinary colours. No logos, no printed graphics, no readable text of any kind on any garment.
>
> Fully transparent background. No hangers, no mannequins, no shadows, no base, no labels, no numbers, no cell borders.

- **Acceptance checklist:**
  - [ ] Twelve distinct garments, each holding the attached body's shoulder and chest width.
  - [ ] No body parts drawn — garment only.
  - [ ] Every garment starts and ends at the same shoulder and hip lines.
  - [ ] No logos, no text, transparent, no hangers or shadows.
- **After it returns:** `wardrobe` as `OCD_CANDIDATE_WARDROBE_TOPS_MASC_AVERAGE_12UP_3584x4800_01.png`. Claude processes after return: YES.
- **Repeat for other morphologies** by attaching A2, A3, A4, A5 or A6 instead and changing the filename accordingly. Do not run these until you actually need that morphology dressed.

---

### PROMPT B4 — Bottoms, twelve, for one morphology

- **Status:** GENERATE
- **Reference to attach:** the returned **A1 sheet** (or whichever morphology you are dressing).
- **For:** the `bottom` layer. Same morphology-specific reasoning as B3.
- **Target:** 3584 x 4800 PNG, transparent, 3 x 4 grid.

> **PASTE THIS INTO GEMINI:**
>
> The attached sheet shows one adult man in eight poses. Study his exact build — particularly his hip width and leg length — and the drawing style.
>
> Create a NEW sheet on a fully transparent background: twelve different lower-body garments, drawn as they would look worn by THIS EXACT MAN standing straight and facing the viewer, in a 3-column by 4-row grid on a 3584 by 4800 canvas.
>
> Draw only the garment — the fabric, the waistband, the legs, the pockets. Do not draw his torso, his feet, his shoes or any part of his body. Each garment holds his exact hip width and leg length, because these will be layered onto that body.
>
> Every garment begins at the same waistband line — at the top of the hips, where a waistband actually sits, not up at the ribs — and the trousers end at the ankle.
>
> The twelve garments: (1) straight-leg jeans, (2) dress trousers, (3) chinos, (4) work trousers with side pockets, (5) corduroy trousers, (6) knee-length shorts, (7) track trousers, (8) heavy canvas work trousers, (9) pleated dress trousers, (10) slim jeans, (11) cargo trousers, (12) lightweight summer trousers.
>
> Plain, muted, ordinary colours. No logos, no printed graphics, no readable text.
>
> Fully transparent background. No hangers, no mannequins, no shadows, no base, no labels, no numbers, no cell borders.

- **Acceptance checklist:**
  - [ ] Twelve distinct garments holding the attached body's hip width.
  - [ ] **Waistband at the hip line, not at the ribs** — this is the specific error the project has already had once.
  - [ ] No body parts, no feet, no shoes.
  - [ ] No logos, no text, transparent, no hangers.
- **After it returns:** `wardrobe` as `OCD_CANDIDATE_WARDROBE_BOTTOMS_MASC_AVERAGE_12UP_3584x4800_01.png`. Claude processes after return: YES.

---

# WAVE C — CHILD AND ADOLESCENT

**Never solve a child by scaling an adult.** A child is not a small adult: the
head is proportionally much larger, the limbs shorter relative to the torso, and
the stance different. A scaled adult reads as a doll, and PR #87 now starts
lives at age ten by default, so this wave has a real and current consumer.

### PROMPT C1 — Child morphology, about nine years old — 8-pose sheet

- **Status:** GENERATE
- **Reference to attach:** the returned **A1 sheet** for drawing style only. **The build must not be a scaled adult.**
- **For:** child body authority. Consumer: PR #87's formative-years play, which begins at ten.
- **Target:** 5056 x 3392 PNG, transparent, 4 x 2 grid.

> **PASTE THIS INTO GEMINI:**
>
> Create a character reference sheet on a fully transparent background: one child of about nine years old, drawn eight times in eight poses, in a 4-column by 2-row grid on a 5056 by 3392 canvas. Match the drawing style, line weight and shading of the attached sheet. The same child in all eight cells.
>
> The proportions are the most important part of this task and they are NOT an adult's. This child is about 6 heads tall, not 7 or 8 — the head is proportionally much larger than an adult's. The limbs are short relative to the torso, the shoulders are narrow and not much wider than the head, the waist and hips are almost the same width, and there is no adult muscle definition anywhere. Do not draw a small adult. Do not draw an adult's proportions at a smaller size.
>
> The child wears ordinary everyday clothes a nine-year-old wears — a t-shirt or a long-sleeved top, trousers or jeans, and trainers. Nothing branded, no readable text, no character graphics on the clothing.
>
> The eight poses, in reading order:
> Row 1: (1) standing straight, arms at sides, facing viewer. (2) standing, quarter turn, one hand in a small gesture, talking. (3) standing still and attentive, listening to an adult off-camera. (4) standing with both hands resting on the edge of a table at about chest height for a child — only a suggestion of the table edge.
> Row 2: (5) sitting upright on a plain chair facing viewer, hands on thighs, feet reaching the floor. (6) sitting at a school desk, forearms on the desk surface — only the near desk edge. (7) sitting, quarter turn, one hand gesturing. (8) standing straight, quarter turn, arms relaxed.
>
> Each figure complete crown to soles, clear transparent space around each, no limb cropped at a cell boundary. No cell borders, grid lines, labels, numbers, captions, ground shadows or background. Fully transparent everywhere.

- **Acceptance checklist:**
  - [ ] About **6 heads tall** — measure it. This is the pass/fail criterion.
  - [ ] Head proportionally large, shoulders narrow, no adult definition.
  - [ ] Does not read as a shrunken adult.
  - [ ] Cell 4 table edge is at child chest height, not adult lectern height.
  - [ ] 8 complete figures, same child, transparent, no text.
- **After it returns:** `people-pose` as `OCD_CANDIDATE_PEOPLE_POSE_CHILD_09_8POSE_5056x3392_01.png`. Claude processes after return: YES.

---

### PROMPT C2 — Adolescent morphology, about fifteen — 8-pose sheet

- **Status:** GENERATE
- **Reference to attach:** the returned **A1 sheet** for style.
- **For:** adolescent body authority. Consumer: PR #87's adolescent life stage.
- **Target:** 5056 x 3392 PNG, transparent, 4 x 2 grid.

> **PASTE THIS INTO GEMINI:**
>
> Create a character reference sheet on a fully transparent background: one adolescent of about fifteen years old, drawn eight times in eight poses, in a 4-column by 2-row grid on a 5056 by 3392 canvas. Match the drawing style, line weight and shading of the attached sheet. The same person in all eight cells.
>
> The proportions sit between a child's and an adult's, which is exactly what makes an adolescent look like one. About 7 heads tall. Long limbs relative to the torso — the limbs have caught up before the frame has filled out. Narrow shoulders and a slight chest with no adult muscle definition. The posture is slightly less settled than an adult's: weight on one hip, shoulders a little rounded.
>
> The adolescent wears ordinary everyday clothes — a t-shirt or hoodie, jeans, trainers. Nothing branded, no readable text, no graphics on the clothing.
>
> The eight poses, in reading order:
> Row 1: (1) standing straight, arms at sides, facing viewer. (2) standing, quarter turn, one hand in a small gesture, talking. (3) standing still and attentive, listening. (4) standing with both hands on the edge of a table or counter at waist height — only a suggestion of the edge.
> Row 2: (5) sitting upright on a plain chair facing viewer, hands on thighs. (6) sitting at a desk, forearms on the desk surface — only the near desk edge. (7) sitting, quarter turn, one hand gesturing. (8) standing straight, quarter turn, arms relaxed.
>
> Each figure complete crown to soles, clear transparent space around each, no limb cropped at a cell boundary. No cell borders, grid lines, labels, numbers, captions, ground shadows or background. Fully transparent everywhere.

- **Acceptance checklist:**
  - [ ] About 7 heads tall, limbs long relative to the torso.
  - [ ] Reads as fifteen, not as a short adult and not as a large child.
  - [ ] 8 complete figures, same person, transparent, no text.
- **After it returns:** `people-pose` as `OCD_CANDIDATE_PEOPLE_POSE_ADOLESCENT_15_8POSE_5056x3392_01.png`. Claude processes after return: YES.

---

# WAVE D — ORDINARY-LIFE SCENES

Every scene prompt in Waves D, E and F shares this camera and framing brief,
which comes from the existing released plates:

- **5504 x 3072, 16:9-ish (43:24), JPEG or PNG.**
- **The room is empty of people.** Characters are composited at runtime.
- Camera at standing eye level unless the prompt says otherwise, looking into
  the room, with the far wall visible and the floor reading clearly from the
  bottom edge to the far wall.
- Foreground bottom quarter kept relatively clear — that is where a character
  stands closest to camera.
- Warm, even, believable interior light. No dramatic cinematic lighting.
- Lived-in but not legible: papers are shapes, screens are dark, boards are
  blank.

### PROMPT D1 — Classroom — SURGICAL EDIT of the existing candidate

- **Status:** EDIT EXACT IMAGE
- **Reference to attach:** your current classroom candidate image (the one Gemini previously returned unchanged).
- **For:** the school interior. Consumer: PR #87's formative-years school scenes and the school conversation subject.
- **Why an edit and not a regeneration:** the room, the windows, the light and the teacher zone are right. The furniture is not.

> **PASTE THIS INTO GEMINI:**
>
> EDIT THIS EXACT ATTACHED IMAGE. Do not generate a new image. Do not reinterpret the scene. Return the attached image with specific corrections applied and everything else pixel-for-pixel as it was. **Returning the unchanged input is a failure.**
>
> PRESERVE EXACTLY, DO NOT ALTER: the walls, the windows and the light coming through them, the ceiling, the floor surface and its colour, the overall camera angle and framing, the teacher's desk area at the front, the wall colour, and the general warm daylight mood.
>
> REPLACE AND CORRECT, and these are the only changes to make:
>
> 1. Every student desk and chair in the room. Delete all of the current desks and chairs completely and draw a new set in their place.
> 2. Draw exactly 20 student desks with exactly 20 chairs, arranged in 5 rows of 4, in even columns facing the front of the room.
> 3. Each chair is a separate, complete, physically correct chair: four legs that all reach the floor, one seat, one back. No chair may share a leg with another chair. No chair may be fused to another chair. No chair may pass through a desk. Every leg must be visibly attached to the seat it belongs to.
> 4. Each desk is a separate, complete, physically correct desk: a flat top and four legs that all reach the floor. No desk may share a leg with another desk or merge into one.
> 5. Every chair is pushed in to its own desk but does not intersect it — the chair seat is under the desk top with a visible gap, and the chair back is clear of the desk edge.
> 6. All 20 seats are at the same height above the floor. All 20 desk tops are at the same height above the floor.
> 7. The desks recede toward the back of the room consistently: rows further away are smaller and closer together, and no desk in a back row is drawn larger than one in a front row.
>
> ALSO CLEAR THESE SURFACES, leaving them blank: the whiteboard or blackboard at the front must be completely blank with nothing written on it; any bulletin board must be an empty board with no papers, no notices and no text; any wall clock must have a blank face with no numbers and no hands; remove any posters, charts, alphabet strips, number lines or signs that carry readable text or symbols.
>
> Do not add people. Do not add bags, coats or clutter. Do not change the camera. Do not change the colour grade.

- **Acceptance checklist:**
  - [ ] The returned image is **visibly different** from the input. If it is identical, the prompt failed — re-run it.
  - [ ] Count the chairs: exactly 20. Count the desks: exactly 20.
  - [ ] Pick any three chairs and trace their legs: four each, all reaching the floor, none shared.
  - [ ] No chair passes through a desk.
  - [ ] Seat heights match across the room.
  - [ ] Board blank, bulletin board empty, clock face blank, no readable text anywhere.
  - [ ] Walls, windows, light and teacher area unchanged.
- **After it returns:** `scene-environment` as `OCD_SCENE_MASTER_CLASSROOM_5504x3072_01.jpg`. **Upscale:** yes, to 5504 px wide if it returns smaller. **Remove background:** no. Claude processes after return: YES — scene intake, tier derivation and registration.

---

### PROMPT D2 — Ordinary workplace — small open-plan office

- **Status:** GENERATE
- **Reference:** NO REFERENCE.
- **For:** the ordinary working life most characters have. Consumer: adult ordinary-life scenes; the workplace conversation setting.
- **Target:** 5504 x 3072.

> **PASTE THIS INTO GEMINI:**
>
> Create a wide illustration of a small, ordinary, empty open-plan office interior, 5504 by 3072 pixels, in a flat clean illustration style with soft shading — the look of a modern narrative video game background, not photorealism.
>
> The room: six or seven desks in two facing rows down the middle of the room, each with a desk chair pushed in. A window wall along the left side with daylight coming through. A row of low filing cabinets along the right wall with a printer on top of one. A small kitchen counter with a kettle and mugs at the far end. A whiteboard on the right-hand wall. A couple of pot plants. A worn carpet.
>
> Camera at standing eye level, looking down the length of the room toward the far end, so the floor reads clearly from the bottom of the frame back to the far wall. Keep the bottom quarter of the frame relatively open.
>
> The room is completely empty of people.
>
> Furniture must be physically correct: every chair has its full set of legs or a complete five-star base, every desk has four legs that reach the floor, no two pieces of furniture share a leg or pass through each other, and all desk tops are at the same height.
>
> Every surface that could carry information must be blank: the whiteboard is completely blank, every computer monitor is switched off and dark, papers on the desks are blank sheets with no writing, and there are no signs, posters, calendars or notices with any readable text anywhere in the image.
>
> Warm, even, believable office daylight. Lived-in and slightly untidy, but nothing readable.

- **Acceptance checklist:**
  - [ ] Empty of people. [ ] All monitors dark. [ ] Whiteboard blank. [ ] No readable text anywhere.
  - [ ] Chair and desk topology correct — count legs on three of each.
  - [ ] Floor reads from the bottom edge to the far wall; bottom quarter reasonably clear.
- **After it returns:** `scene-environment` as `OCD_SCENE_MASTER_ORDINARY_WORKPLACE_5504x3072_01.jpg`. Upscale to 5504 wide if smaller. Claude processes after return: YES.

---

### PROMPT D3 — Clinic examination room

- **Status:** GENERATE · **Reference:** NO REFERENCE · **Target:** 5504 x 3072
- **For:** health and care scenes; the clinic visit in the 18C ordinary-life corpus.

> **PASTE THIS INTO GEMINI:**
>
> Create a wide illustration of a small, ordinary, empty medical examination room, 5504 by 3072 pixels, flat clean illustration style with soft shading, in the look of a modern narrative video game background.
>
> The room: an examination couch with a paper cover along the right wall, a doctor's rolling stool beside it, a small desk with a chair against the left wall, a wall-mounted blood pressure cuff, a sink with a paper towel dispenser, a curtain rail with the curtain pushed back, a small cabinet of supplies, a wall-mounted screen that is switched off. Vinyl floor. Plain painted walls.
>
> Camera at standing eye level from the doorway looking into the room, floor reading clearly from the bottom of the frame to the far wall. Keep the bottom quarter reasonably open.
>
> Completely empty of people.
>
> Furniture physically correct: the stool has a complete base, the chair has all its legs, the couch is a single solid piece, nothing intersects anything else.
>
> Everything that could carry information must be blank: no posters, no charts, no anatomical diagrams, no labels on the supply cabinet, no writing on any paper, the screen is dark and blank, and there is no readable text of any kind anywhere in the image.
>
> Clean, even, slightly cool clinical daylight.

- **Acceptance checklist:** empty of people · no charts or diagrams · screen dark · no readable text · furniture topology correct · floor reads to the far wall.
- **After it returns:** `scene-environment` as `OCD_SCENE_MASTER_CLINIC_EXAM_ROOM_5504x3072_01.jpg`. Claude processes: YES.

---

### PROMPT D4 — Grocery store aisle

- **Status:** GENERATE · **Reference:** NO REFERENCE · **Target:** 5504 x 3072
- **For:** ordinary errands and the everyday scenes in the 18C corpus.

> **PASTE THIS INTO GEMINI:**
>
> Create a wide illustration of an ordinary, empty grocery store aisle, 5504 by 3072 pixels, flat clean illustration style with soft shading, in the look of a modern narrative video game background.
>
> The scene: one aisle running away from the camera between two tall shelving units stacked with packaged goods, a polished floor, fluorescent ceiling lighting, and the end of the aisle opening onto a wider area at the back.
>
> Camera at standing eye level looking down the aisle, so the floor reads clearly from the bottom of the frame to the far end. Keep the bottom quarter reasonably open.
>
> Completely empty of people and empty of shopping trolleys.
>
> This is the important part: every package, box, tin, bottle and carton on the shelves must be a plain, blank, unbranded shape in a solid colour. No labels, no logos, no brand names, no product names, no prices, no barcodes, no shelf-edge tickets, no aisle signs, no readable text or numbers of any kind anywhere in the image. The shelves should read as full of groceries at a glance and carry no information at all on inspection.
>
> Even, bright, ordinary supermarket lighting.

- **Acceptance checklist:** empty of people and trolleys · **every package unbranded and blank** · no shelf tickets, prices or aisle signs · no readable text anywhere · floor reads down the aisle.
- **After it returns:** `scene-environment` as `OCD_SCENE_MASTER_GROCERY_AISLE_5504x3072_01.jpg`. Claude processes: YES.

---

### PROMPT D5 — Residential street with a bus stop

- **Status:** GENERATE · **Reference:** NO REFERENCE · **Target:** 5504 x 3072
- **For:** the street, the doorstep-adjacent exterior, and the neighborhood conversation setting. Consumer: PR #87's neighborhood conversation subject.

> **PASTE THIS INTO GEMINI:**
>
> Create a wide illustration of an ordinary American residential street with a bus stop, 5504 by 3072 pixels, flat clean illustration style with soft shading, in the look of a modern narrative video game background.
>
> The scene: a pavement running across the frame in the foreground, a bus shelter with a bench on the left, a row of modest two-storey houses with porches and small front yards behind it, parked cars along the kerb, a couple of street trees, overhead power lines, and a trash can. Late afternoon light.
>
> Camera at standing eye level on the pavement, looking along the street so the pavement reads clearly from the bottom of the frame into the distance. Keep the bottom quarter reasonably open so a figure can stand near the camera.
>
> Completely empty of people.
>
> The bus shelter's timetable panel and any advertising panel must be completely blank. House numbers, street signs, car number plates, shop signs and any other lettering must not appear — no readable text or numbers of any kind anywhere in the image.
>
> Ordinary, warm, believable late-afternoon daylight. Lived-in and slightly worn.

- **Acceptance checklist:** empty of people · timetable and ad panels blank · no house numbers, street signs or number plates · no readable text anywhere · pavement reads into the distance.
- **After it returns:** `scene-environment` as `OCD_SCENE_MASTER_RESIDENTIAL_STREET_BUS_STOP_5504x3072_01.jpg`. Claude processes: YES.

---

# WAVE E — CAMPAIGN AND POLITICAL SCENES

### PROMPTS E1–E3 — HOLD UNTIL CLAUDE'S INTAKE VERDICT

Three rooms were uploaded to Drive root and have **not been pixel-inspected**
by any agent — the sandbox this pack was written in could not fetch them (see
76B for the exact cause). Their status is genuinely unknown, and generating
replacements before they are inspected would be exactly the waste this pack
exists to avoid.

|        | File           | Drive ID                            | What it is believed to be                                                |
| ------ | -------------- | ----------------------------------- | ------------------------------------------------------------------------ |
| **E1** | `IMG_5205.JPG` | `1omryvYo8QYASr96guWI7XeQkJ6hdTKCu` | Campaign / volunteer storefront office, believed **clean of baked text** |
| **E2** | `IMG_5202.JPG` | `1SPvoi-0L7T4mK156yFg1dpOW82ggb4J6` | Press briefing room with podium, chairs, cameras                         |
| **E3** | `IMG_5204.JPG` | `1SVG_lRUgoMJTmyreTsmhLJB6roJitFr1` | Park / community pavilion with picnic tables                             |

Also in root: `IMG_5207.JPG` (`1hWiTaD7qSg5QJUKvTGaK2w6NGGWlPGqG`), the earlier
storefront that **does** carry baked `FIELD OFFICE` and `supplies` text. Keep it
as provenance; it must not become the production master.

**What to do:** hand these four to Claude in a session that can read the pixels,
or attach them directly to a Claude run. Claude will chair-count, text-check and
either intake them or return the E1/E2/E3 edit prompt with the exact defects
named. **Do not generate replacements first.**

If any of the three does fail intake, the edit prompt it needs has this shape —
fill the bracketed parts from Claude's defect list:

> EDIT THIS EXACT ATTACHED IMAGE. Do not generate a new image. **Returning the unchanged input is a failure.**
> PRESERVE EXACTLY: [the room, walls, windows, camera, light — whatever the intake found correct].
> REPLACE AND CORRECT: [the exact chairs/tables/objects the intake named, with the intended counts and layout].
> CLEAR TO BLANK: [every surface the intake found carrying readable text].
> Do not add people. Do not change the camera or the colour grade.

---

### PROMPT E4 — Constituent casework counter

- **Status:** GENERATE · **Reference:** NO REFERENCE · **Target:** 5504 x 3072
- **For:** the front counter of a local government office where the public is served. Consumer: casework and constituent-service scenes; 18B's municipal admin spaces.

> **PASTE THIS INTO GEMINI:**
>
> Create a wide illustration of the empty public front counter of a small local government office, 5504 by 3072 pixels, flat clean illustration style with soft shading, in the look of a modern narrative video game background.
>
> The scene: a long service counter running across the middle of the frame, with two or three staff positions behind it, each with a chair and a switched-off monitor. In front of the counter, a small waiting area with a row of four linked chairs against the left wall and a low table. A ticket display screen on the wall, switched off. A leaflet rack. A door to the back offices. Hard-wearing floor, institutional but not grim.
>
> Camera at standing eye level from the waiting side, looking at the counter, floor reading clearly from the bottom of the frame to the counter. Keep the bottom quarter reasonably open.
>
> Completely empty of people.
>
> Furniture physically correct: the linked chairs share a frame, which is correct for linked seating, but each seat and back is complete and the frame's legs all reach the floor; the staff chairs have complete five-star bases; nothing intersects the counter.
>
> Everything that could carry information must be blank: all monitors dark, the ticket display blank and unlit, the leaflet rack holding plain blank folded card with no printing, no signs, no notices, no opening-hours board, no seal, no crest, no readable text or numbers anywhere in the image.
>
> Even, ordinary institutional daylight.

- **Acceptance checklist:** empty of people · monitors and ticket display dark and blank · leaflets blank · **no seal or crest** · no readable text · chair topology correct.
- **After it returns:** `scene-environment` as `OCD_SCENE_MASTER_CASEWORK_COUNTER_5504x3072_01.jpg`. Claude processes: YES.

---

### PROMPT E5 — Campaign debate stage

- **Status:** GENERATE · **Reference:** NO REFERENCE · **Target:** 5504 x 3072
- **For:** the debate scene family in 18F. Consumer: campaign play (PR #85's lane) — generated ahead.

> **PASTE THIS INTO GEMINI:**
>
> Create a wide illustration of an empty debate stage set up in a community hall or school auditorium, 5504 by 3072 pixels, flat clean illustration style with soft shading, in the look of a modern narrative video game background.
>
> The scene: a low stage with two lecterns set apart from each other facing the audience, a moderator's table with one chair set to the side, a plain backdrop curtain behind, stage lighting rigged above, and the first few rows of empty audience seating visible in the foreground from behind.
>
> Camera at standing eye level from the audience floor, slightly below stage level looking up at the stage, with the stage occupying the middle band of the frame. Keep the bottom quarter reasonably open.
>
> Completely empty of people.
>
> Furniture physically correct: each lectern is a complete solid object standing on the stage floor; the moderator's table has four legs reaching the floor; the audience seats are complete linked chairs with a shared frame whose legs all reach the floor; nothing intersects anything else.
>
> The backdrop must be a plain, blank curtain or panel with no logos, no slogans, no names, no bunting with lettering, no flags with identifiable insignia, and no seal. The lecterns are plain with blank front faces. No microphones with visible station badges. No readable text or numbers anywhere in the image.
>
> Warm stage lighting on the stage, cooler dim light over the audience.

- **Acceptance checklist:** empty of people · **backdrop completely blank** · lectern faces blank · no flags, seals or slogans · no readable text · seat topology correct.
- **After it returns:** `scene-environment` as `OCD_SCENE_MASTER_DEBATE_STAGE_5504x3072_01.jpg`. Claude processes: YES.

---

### PROMPT E6 — Fundraiser reception room

- **Status:** GENERATE · **Reference:** NO REFERENCE · **Target:** 5504 x 3072

> **PASTE THIS INTO GEMINI:**
>
> Create a wide illustration of an empty reception room set up for an evening fundraiser, 5504 by 3072 pixels, flat clean illustration style with soft shading, in the look of a modern narrative video game background.
>
> The scene: a modest function room with round tables covered in cloths and set with glasses, a drinks table along one wall, a small raised platform with a lectern at the far end, folding chairs around the tables, warm lamps and string lights, and a wooden floor.
>
> Camera at standing eye level from the doorway looking across the room toward the platform, floor reading clearly from the bottom of the frame to the far wall. Keep the bottom quarter reasonably open.
>
> Completely empty of people.
>
> Furniture physically correct: every round table has a complete central pedestal or a full set of legs reaching the floor; every folding chair is a separate complete chair with four legs; no chair shares a leg with another; no chair passes through a table; all seat heights match; all table tops are at the same height.
>
> Everything that could carry information must be blank: no banner, no signage, no name cards on the tables, no printed menus, no branded bunting, no logo on the lectern, no readable text or numbers anywhere in the image.
>
> Warm, low, evening interior light.

- **Acceptance checklist:** empty of people · no banner, name cards or menus · lectern face blank · no readable text · every chair and table complete and non-intersecting · consistent heights.
- **After it returns:** `scene-environment` as `OCD_SCENE_MASTER_FUNDRAISER_RECEPTION_5504x3072_01.jpg`. Claude processes: YES.

---

### PROMPT E7 — Caucus / negotiation room

- **Status:** GENERATE · **Reference:** NO REFERENCE · **Target:** 5504 x 3072

> **PASTE THIS INTO GEMINI:**
>
> Create a wide illustration of an empty small meeting room set up for a private negotiation, 5504 by 3072 pixels, flat clean illustration style with soft shading, in the look of a modern narrative video game background.
>
> The scene: one long table down the middle of the room with eight chairs around it, a sideboard with a coffee urn and cups, a wall-mounted screen that is switched off, heavy curtains half drawn across a window, and a closed door. Panelled walls, carpet, an old institutional room that has been used for a long time.
>
> Camera at standing eye level from one end of the table looking down its length, floor reading clearly from the bottom of the frame to the far wall. Keep the bottom quarter reasonably open.
>
> Completely empty of people.
>
> Furniture physically correct: the table has a complete set of legs or two solid supports, all reaching the floor; each of the eight chairs is separate and complete with four legs; no chair shares a leg or passes through the table; every chair is pulled up to the table without intersecting it; all eight seats are at the same height.
>
> Everything that could carry information must be blank: the screen is dark, the papers on the table are blank sheets, there are no name plates, no folders with printing, no clock with numbers, no seal, no flag, and no readable text or numbers anywhere in the image.
>
> Warm, dim, slightly heavy interior light.

- **Acceptance checklist:** empty of people · **exactly 8 complete chairs, none fused, none intersecting the table** · screen dark · papers blank · no name plates, seals or flags · no readable text.
- **After it returns:** `scene-environment` as `OCD_SCENE_MASTER_CAUCUS_ROOM_5504x3072_01.jpg`. Claude processes: YES.

---

### PROMPT E8 — School board room

- **Status:** GENERATE · **Reference:** NO REFERENCE · **Target:** 5504 x 3072
- **For:** 18B's school-board hearing space. Distinct from the released civic hearing room: smaller, plainer, school rather than city hall.

> **PASTE THIS INTO GEMINI:**
>
> Create a wide illustration of an empty school board meeting room, 5504 by 3072 pixels, flat clean illustration style with soft shading, in the look of a modern narrative video game background.
>
> The scene: a raised curved dais at the far end with seven seats behind it facing the room, each place set with a microphone on a short stand and a blank name plate holder; a small speaker's lectern on the floor facing the dais; four rows of folding chairs for the public facing the dais; a side table for staff; plain institutional walls; a hard floor.
>
> Camera at standing eye level from the back of the public seating looking toward the dais, so the floor reads clearly from the bottom of the frame to the dais. Keep the bottom quarter reasonably open.
>
> Completely empty of people.
>
> Furniture physically correct: the dais is one continuous solid structure; each of the seven seats behind it is a complete chair; every public folding chair is a separate complete chair with four legs reaching the floor; no chair shares a leg with another; no chair intersects another chair or a table; all public seats are at the same height; the rows recede consistently with rows further back drawn smaller.
>
> Everything that could carry information must be blank: the name plate holders are empty with no lettering, there is no seal or crest on the dais front, no flags, no agenda papers with writing, no screens showing anything, no wall clock with numbers, no notices, and no readable text or numbers anywhere in the image.
>
> Even, plain, institutional light.

- **Acceptance checklist:** empty of people · **7 dais seats, name plates empty, no seal or crest** · public chairs complete and non-fused, consistent heights, receding correctly · no readable text.
- **After it returns:** `scene-environment` as `OCD_SCENE_MASTER_SCHOOL_BOARD_ROOM_5504x3072_01.jpg`. Claude processes: YES.

---

# WAVE F — FUTURE POLITICAL-LIFE SCENE BANK

These are research-ready and have no current runtime consumer. Generate them
ahead whenever you like — they will be waiting when the systems that use them
arrive. Every one uses the shared camera and framing brief at the head of
Wave D, and every one is **empty of people** with **every informational surface
blank**.

### PROMPT F1 — Emergency operations centre

> **PASTE THIS INTO GEMINI:**
>
> Create a wide illustration of an empty emergency operations centre, 5504 by 3072 pixels, flat clean illustration style with soft shading, in the look of a modern narrative video game background.
>
> The scene: rows of desks facing a wall of large wall-mounted screens, each desk with a chair and two monitors, telephone handsets, a long table at the back, a whiteboard on a side wall, cable trays overhead, a windowless room lit by ceiling panels.
>
> Camera at standing eye level from the back of the room looking toward the screen wall, floor reading clearly from the bottom of the frame forward. Keep the bottom quarter reasonably open. Completely empty of people.
>
> Furniture physically correct: every chair has a complete five-star base; every desk has a full set of supports reaching the floor; nothing shares a leg or intersects anything else; all desk tops are at the same height.
>
> EVERY SCREEN — the wall screens and every desk monitor — must be switched off and completely dark. No maps, no charts, no camera feeds, no dashboards, no data. The whiteboard is blank. No labels on the desks, no signage, no clocks with numbers, no readable text or numbers anywhere in the image.
>
> Cool, even, artificial interior light.

- **Acceptance:** every screen dark · whiteboard blank · no maps or data · no readable text · chair and desk topology correct.
- **Upload as** `OCD_SCENE_MASTER_EOC_CRISIS_ROOM_5504x3072_01.jpg`.

### PROMPT F2 — Courthouse corridor

> **PASTE THIS INTO GEMINI:**
>
> Create a wide illustration of an empty courthouse corridor, 5504 by 3072 pixels, flat clean illustration style with soft shading, in the look of a modern narrative video game background.
>
> The scene: a wide stone-floored corridor with tall panelled doors along one side, wooden benches against the opposite wall, tall windows letting in light from the far end, a high ceiling with plaster mouldings, a noticeboard on the wall.
>
> Camera at standing eye level looking down the length of the corridor, floor reading clearly from the bottom of the frame into the distance. Keep the bottom quarter reasonably open. Completely empty of people.
>
> Furniture physically correct: each bench is a complete solid piece standing on the floor; nothing intersects a wall or another object.
>
> The noticeboard is completely empty. There are no room numbers on the doors, no name plates, no court lists, no signs, no seals, no crests, no flags, and no readable text or numbers anywhere in the image.
>
> Cool daylight from the far windows, warm reflected light on the stone.

- **Acceptance:** empty of people · noticeboard empty · **no room numbers, name plates, seals or crests** · no readable text · corridor floor reads into the distance.
- **Upload as** `OCD_SCENE_MASTER_COURTHOUSE_CORRIDOR_5504x3072_01.jpg`.

### PROMPT F3 — Hallway press scrum position

> **PASTE THIS INTO GEMINI:**
>
> Create a wide illustration of an empty corridor position outside a committee room where a press scrum forms, 5504 by 3072 pixels, flat clean illustration style with soft shading, in the look of a modern narrative video game background.
>
> The scene: a wide institutional corridor with a closed double door on the right, a cluster of empty camera tripods without cameras standing to one side, a lighting stand, a coil of cable taped to the floor, a bench against the far wall, marble-effect floor.
>
> Camera at standing eye level a few metres from the door, looking along the corridor. Floor reads clearly from the bottom of the frame. Keep the bottom quarter reasonably open. Completely empty of people.
>
> Furniture and equipment physically correct: each tripod has three legs all reaching the floor and is a separate complete object; nothing shares a leg; nothing floats.
>
> No station logos on any equipment, no microphone flags, no name plates on the door, no room numbers, no signage, no seals, and no readable text or numbers anywhere in the image.
>
> Even, bright institutional light.

- **Acceptance:** empty of people · **tripods have three legs each and no station logos** · no microphone flags · no door plates or numbers · no readable text.
- **Upload as** `OCD_SCENE_MASTER_HALLWAY_PRESS_SCRUM_5504x3072_01.jpg`.

### PROMPT F4 — Television interview studio

> **PASTE THIS INTO GEMINI:**
>
> Create a wide illustration of an empty small television interview studio, 5504 by 3072 pixels, flat clean illustration style with soft shading, in the look of a modern narrative video game background.
>
> The scene: two armchairs angled toward each other across a low table on a small set, a large curved backdrop behind them, studio lights on stands and rigged overhead, two large cameras on pedestals facing the set, cables on the floor, the dark edges of the studio beyond the lit set.
>
> Camera at standing eye level from behind and to one side of the studio cameras, looking at the set. Floor reads clearly from the bottom of the frame. Keep the bottom quarter reasonably open. Completely empty of people.
>
> Furniture and equipment physically correct: each armchair is complete and stands on the floor; each camera pedestal has a complete base with all wheels touching the floor; each light stand has three legs all reaching the floor; nothing floats and nothing shares a leg.
>
> The backdrop must be a plain blank colour or an abstract non-representational pattern — no programme name, no channel logo, no city skyline that reads as a specific place, no text. No monitors showing anything. No readable text or numbers anywhere in the image.
>
> Bright key lighting on the set, dark surroundings.

- **Acceptance:** empty of people · **backdrop blank or abstract, no logo or programme name** · monitors dark · equipment topology correct · no readable text.
- **Upload as** `OCD_SCENE_MASTER_TV_INTERVIEW_STUDIO_5504x3072_01.jpg`.

### PROMPT F5 — Diplomatic bilateral room

> **PASTE THIS INTO GEMINI:**
>
> Create a wide illustration of an empty formal room set up for a bilateral meeting between two delegations, 5504 by 3072 pixels, flat clean illustration style with soft shading, in the look of a modern narrative video game background.
>
> The scene: two facing rows of armchairs with small side tables between them, a long low table down the centre with water glasses, an ornate but restrained interior with panelled walls and a patterned carpet, tall windows with heavy curtains, a fireplace or a large plain mirror on the end wall.
>
> Camera at standing eye level from one end of the seating looking down between the two rows. Floor reads clearly from the bottom of the frame to the far wall. Keep the bottom quarter reasonably open. Completely empty of people.
>
> Furniture physically correct: every armchair is a separate complete piece standing on the floor; every side table has a full set of legs; nothing shares a leg or intersects anything else; all chairs in a row are at the same height.
>
> There must be no flags of any kind, no seals, no crests, no coats of arms, no name plates, no place cards, no folders with printing, and no readable text or numbers anywhere in the image. The room must read as formal and important without belonging to any identifiable country or institution.
>
> Warm, formal, even interior light.

- **Acceptance:** empty of people · **no flags, seals, crests or place cards** · no identifiable country · furniture topology correct · no readable text.
- **Upload as** `OCD_SCENE_MASTER_DIPLOMATIC_BILATERAL_5504x3072_01.jpg`.

### PROMPT F6 — Diner booth

> **PASTE THIS INTO GEMINI:**
>
> Create a wide illustration of an empty American diner interior seen from beside a booth, 5504 by 3072 pixels, flat clean illustration style with soft shading, in the look of a modern narrative video game background.
>
> The scene: a row of upholstered booths along a window wall with a table in each, a counter with stools opposite, a pass-through to the kitchen, coat hooks, salt and pepper and a napkin dispenser on each table, a tiled floor, morning light through the windows.
>
> Camera at standing eye level in the aisle beside the nearest booth, looking down the row of booths. Floor reads clearly from the bottom of the frame. Keep the bottom quarter reasonably open. Completely empty of people.
>
> Furniture physically correct: each booth is a complete solid bench and back; each table has a complete pedestal or full set of legs reaching the floor; each counter stool has a complete base; nothing shares a support and nothing intersects a table; all booth seats are at the same height.
>
> No menus with printing, no specials board with writing, no signs, no branded condiment bottles, no wall photographs that read as specific, no neon sign with lettering, and no readable text or numbers anywhere in the image.
>
> Warm morning light, worn and comfortable.

- **Acceptance:** empty of people · **no menus, specials board or lettering** · condiments unbranded · furniture topology correct · no readable text.
- **Upload as** `OCD_SCENE_MASTER_DINER_BOOTH_5504x3072_01.jpg`.

### PROMPT F7 — Hospital room visit

> **PASTE THIS INTO GEMINI:**
>
> Create a wide illustration of an empty single hospital room, 5504 by 3072 pixels, flat clean illustration style with soft shading, in the look of a modern narrative video game background.
>
> The scene: an adjustable hospital bed made up with white linen, a visitor's chair beside it, a wheeled bedside table, a monitor on a stand that is switched off, a drip stand, a window with a blind half drawn, a door to a small bathroom, vinyl floor.
>
> Camera at standing eye level from the doorway looking at the bed. Floor reads clearly from the bottom of the frame to the far wall. Keep the bottom quarter reasonably open. Completely empty of people.
>
> Furniture physically correct: the bed has a complete frame on wheels all touching the floor; the visitor's chair has four legs; the drip stand has a complete wheeled base; the bedside table's supports reach the floor; nothing floats or intersects anything else.
>
> The monitor is dark and shows nothing. There are no charts, no wristbands, no name boards, no whiteboard with writing, no posters, no labels on anything, and no readable text or numbers anywhere in the image.
>
> Soft, even, slightly cool daylight.

- **Acceptance:** empty of people · **monitor dark, no charts or name boards** · equipment topology correct · no readable text.
- **Upload as** `OCD_SCENE_MASTER_HOSPITAL_ROOM_5504x3072_01.jpg`.

### PROMPT F8 — Polling place

> **PASTE THIS INTO GEMINI:**
>
> Create a wide illustration of an empty polling place set up in a school gym or community hall, 5504 by 3072 pixels, flat clean illustration style with soft shading, in the look of a modern narrative video game background.
>
> The scene: a row of privacy booths with modesty screens along one side, a check-in table with two chairs near the entrance, a ballot box on a stand, a queue barrier of retractable belt posts, a wooden floor with painted court lines, high windows.
>
> Camera at standing eye level from the entrance looking across the room toward the booths. Floor reads clearly from the bottom of the frame to the far wall. Keep the bottom quarter reasonably open. Completely empty of people.
>
> Furniture physically correct: each booth is a separate complete unit standing on the floor with all its legs; the table has four legs; each belt post has a complete weighted base touching the floor; nothing shares a support or intersects anything else; all booths are the same height.
>
> There must be no signs, no instructions, no arrows, no seals, no flags, no ballot papers with printing, no labels on the ballot box, and no readable text or numbers anywhere in the image.
>
> Even, bright, ordinary hall lighting.

- **Acceptance:** empty of people · **no signs, instructions, seals or flags** · ballot box unlabelled · booth topology correct · no readable text.
- **Upload as** `OCD_SCENE_MASTER_POLLING_PLACE_5504x3072_01.jpg`.

### PROMPT F9 — Door-to-door canvassing street

> **PASTE THIS INTO GEMINI:**
>
> Create a wide illustration of an ordinary residential front path and doorstep seen from the street, 5504 by 3072 pixels, flat clean illustration style with soft shading, in the look of a modern narrative video game background.
>
> The scene: the front of a modest two-storey house with a porch, a short path from the pavement to the front door, a low fence, a small front yard with a patch of grass and a shrub, a trash can beside the path, neighbouring houses receding on either side.
>
> Camera at standing eye level from the pavement at the end of the path, looking up the path at the front door. Path and pavement read clearly from the bottom of the frame to the door. Keep the bottom quarter reasonably open. Completely empty of people.
>
> No house number, no name plate, no signs in the windows, no political signs in the yard, no delivery labels, and no readable text or numbers anywhere in the image.
>
> Ordinary, warm, overcast daylight.

- **Acceptance:** empty of people · **no house number and no yard signs** · no readable text · path reads to the door.
- **Upload as** `OCD_SCENE_MASTER_CANVASS_DOORSTEP_5504x3072_01.jpg`.

### PROMPT F10 — Town hall public meeting room

> **PASTE THIS INTO GEMINI:**
>
> Create a wide illustration of an empty room set up for a public town hall meeting in a community centre, 5504 by 3072 pixels, flat clean illustration style with soft shading, in the look of a modern narrative video game background.
>
> The scene: about forty folding chairs in rows facing a small table at the front with three chairs behind it and a standing microphone on a stand in the aisle for public comment. A plain hall with a stage curtain at one end, a hard floor, a serving hatch at the back.
>
> Camera at standing eye level from the back of the seating looking toward the front table. Floor reads clearly from the bottom of the frame forward. Keep the bottom quarter reasonably open. Completely empty of people.
>
> Furniture physically correct: every folding chair is a separate complete chair with four legs all reaching the floor; no two chairs share a leg; no chair intersects another; all seats are at the same height; the rows recede consistently with the back rows drawn smaller and closer together; the front table has four legs reaching the floor.
>
> There must be no banners, no agenda boards, no name plates, no seals, no flags, no notices, no papers with writing, and no readable text or numbers anywhere in the image.
>
> Even, plain hall lighting.

- **Acceptance:** empty of people · **roughly 40 chairs, none fused, consistent heights, correct recession** · no banners, name plates, seals or flags · no readable text.
- **Upload as** `OCD_SCENE_MASTER_TOWN_HALL_MEETING_5504x3072_01.jpg`.

---

# WAVE G — PROPS, EXPRESSIONS, ACCESSORIES

### PROMPT G1 — Portable prop sheet — CLAUDE PROCESSES, NO GENERATION

- **Status:** NO IMAGE — AGENT PROCESSING
- **File:** `IMG_5203.PNG`, Drive `19IZct9APmb_EE1EBYl3i6_kA9x-7ijQu`, measured 5632 x 3072 RGBA with real varying alpha.
- **What to do:** nothing in Gemini. Hand this file to Claude in a session that can read its pixels. Claude will chop it deterministically, measure each cell's alpha and edge quality, and name each prop from what the raster actually shows.
- **One rule for the naming:** the twelve items are believed to include a phone, a notebook, a clipboard, a lanyard badge, a mug, a folder, a pen, envelopes, keys, a bottle, an umbrella and a bundled stack of paper. **That last item must not be called cash unless the image genuinely shows currency**, and the badge must not be called an ID credential unless it genuinely reads as one. A prop is named for what it is, not for what would be useful.
- **Paper faces stay blank** and are reserved as dynamic surfaces.

### PROMPT G2 — Expression sheet, twelve states, one head

- **Status:** GENERATE
- **Reference to attach:** `OCD_CANDIDATE_HEAD_SOURCE_ADULT_DIVERSITY_12UP_3584x4800_01.png` (Drive `1j1e0yGCRX9N6thGpdlyRZE-EEPH6I5mD`) — pick one head from it and say which cell in your message, or attach a single chopped head.
- **For:** systematic expression coverage. The twelve states below are the ones gameplay actually needs to show, rather than a random assortment of faces.
- **Target:** 3584 x 4800 PNG, transparent, 3 x 4 grid.

> **PASTE THIS INTO GEMINI:**
>
> The attached image shows adult head studies. Take the head I have indicated and study it carefully — the face shape, the skin tone, the hair, the age, the drawing style.
>
> Create a NEW sheet on a fully transparent background showing THAT EXACT SAME PERSON'S head and neck twelve times, once for each of twelve different facial expressions, in a 3-column by 4-row grid on a 3584 by 4800 canvas.
>
> It must be recognisably the same person in every cell — same face shape, same skin tone, same hair, same age, same drawing style. Only the expression changes. The head is at the same size, the same angle and the same position within each cell every time, facing the viewer straight on, so the twelve can be swapped in and out of the same place without the head appearing to move.
>
> The twelve expressions, in reading order:
> Row 1: (1) neutral — relaxed, no particular feeling. (2) warm — a genuine small smile, eyes softened. (3) concerned — brows drawn slightly together, mouth closed and flat, worried about something. (4) skeptical — one brow raised, mouth slightly to one side, not convinced.
> Row 2: (5) angry — brows down and drawn in, jaw set, mouth firm. (6) determined — chin slightly up, brows level, mouth set, resolved. (7) tired — eyelids lowered, face slack, worn out. (8) sad — brows raised at the inner ends, mouth turned down, eyes down.
> Row 3: (9) confused — brows uneven, mouth slightly open, not following. (10) surprised — brows up, eyes wide, mouth open a little. (11) speaking with the mouth open — mid-word, mouth clearly open, otherwise neutral. (12) speaking with the mouth closed — mid-sentence pause, lips together, otherwise neutral.
>
> Draw the head and the neck only, ending cleanly at the base of the neck. Do not draw shoulders, clothing or a body. Do not draw cell borders, grid lines, labels, numbers, captions, shadows or any background. Fully transparent everywhere.

- **Acceptance checklist:**
  - [ ] Recognisably the same person in all twelve cells.
  - [ ] Head at the same size, angle and position in every cell — flip between two and check the head does not shift.
  - [ ] All twelve expressions distinguishable from each other; check 11 and 12 differ only in the mouth.
  - [ ] Head and neck only, no shoulders or clothing.
  - [ ] Transparent, no labels, no borders.
- **After it returns:** `body-head` as `OCD_CANDIDATE_HEAD_EXPRESSION_12UP_3584x4800_01.png`. Claude processes: YES — chop and register as expression variants. **Note:** an expression sheet is a _style and identity reference_ until a production head family is released; it does not become a modular production head by existing.

### PROMPT G3 — Second portable prop sheet

- **Status:** GENERATE
- **Reference to attach:** `IMG_5203.PNG` (Drive `19IZct9APmb_EE1EBYl3i6_kA9x-7ijQu`) for style matching.
- **For:** the props the first sheet does not carry that current and near-term scenes actually use.
- **Target:** 3584 x 4800 PNG, transparent, 3 x 4 grid.

> **PASTE THIS INTO GEMINI:**
>
> The attached image is a sheet of isolated everyday objects on a transparent background. Match its drawing style, its line weight, its shading and its lighting exactly.
>
> Create a NEW sheet on a fully transparent background with twelve DIFFERENT everyday objects, arranged in a 3-column by 4-row grid on a 3584 by 4800 canvas, each object isolated with clear transparent space around it.
>
> The twelve objects: (1) a canvas tote bag, (2) a paper coffee cup with a lid, (3) a bicycle helmet, (4) a set of house keys on a ring with a fob, (5) a rolled-up newspaper, (6) a plain cardboard box, closed, (7) a bunch of flowers wrapped in paper, (8) a lunch box, (9) a backpack, (10) a pair of reading glasses, (11) a small first-aid kit, (12) a clipboard with a blank sheet on it.
>
> Every object must be plain and unbranded. No logos, no printing, no labels, no lettering of any kind on any object. The newspaper is folded so no headline is visible and shows no text. The clipboard's sheet is completely blank. The lunch box and the box have no writing.
>
> Draw each object at a size that fills its cell comfortably, from a simple three-quarter view. Do not draw cell borders, grid lines, labels, numbers, captions, shadows or any background. Fully transparent everywhere.

- **Acceptance checklist:** twelve distinct objects · **nothing branded, no lettering anywhere, newspaper shows no headline** · style matches the attached sheet · transparent with clear space around each object · no shadows or borders.
- **After it returns:** `props` as `OCD_CANDIDATE_PROPS_PORTABLE_12UP_3584x4800_02.png`. Claude processes: YES — chop.

---

## WHAT IS DELIBERATELY NOT IN THIS PACK

**Buttons, menus, panels, frames, icons and every other piece of interface.**
These are CODE-OWNED. They belong in CSS and SVG where they stay crisp at every
resolution, respond to hover, focus and press, and can be restyled without
regenerating anything. Generating raster button art would be slower, worse and
immediately stale. The visual direction for them is specified in
`76A_VISUAL_REFERENCE_MEASUREMENT_AND_GENERATION_SPEC`, and the work is a code
task after PR #87 converges.

**Anything that would put readable civic facts into a picture.** Seals, bill
numbers, vote tallies, results, names, agendas and dates are drawn at runtime
from the world's own records. There is no prompt for them here and there should
never be one.

**Replacements for the three uploaded rooms** (E1–E3) until they have actually
been inspected. Generating first and looking afterwards is how a bank fills up
with rooms nobody needed.

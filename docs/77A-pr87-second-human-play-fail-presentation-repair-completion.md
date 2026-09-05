# 77A — PR #87 Second Human Play FAIL and Presentation Repair — Completion

Canonical completion report for
`77_CLAUDE_PR87_SECOND_HUMAN_PLAY_FAIL_TITLE_CREATOR_NARRATIVE_PRESENTATION_REPAIR`.

A continuation of PR #87 on the same branch. No second PR was opened, nothing
was rebased or force-pushed, and **#87 is left open, draft and unmerged**.
**No human acceptance is claimed** — §12 says exactly what to retest.

---

## 1. Exact state

|                         |                                                                                          |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| Repository              | `lamontaes/Political-Game-Git`                                                           |
| Pull request            | [#87](https://github.com/lamontaes/Political-Game-Git/pull/87), draft, **left unmerged** |
| Branch                  | `claude/pr81-narrative-graphics-lifeflow-t8j8oe`                                         |
| Base / `main`           | `5f735da209c59647e4b877717a40fe6cc045fc24` (unmoved; re-fetched before pushing)          |
| Head the human tested   | `57e56c14cf3cd80d1f92f9249980b7ad18463f70`                                               |
| Human gate at that head | REPAIR REQUIRED / DO NOT MERGE                                                           |
| Head after this packet  | the commit carrying this report — see §11                                                |
| Diff since `57e56c1`    | 30 files changed, 3,490 insertions, 783 deletions                                        |

### Commits

| SHA       | Subject                                                              |
| --------- | -------------------------------------------------------------------- |
| `6ab172c` | Make the title screen a place, and put the menu beside it            |
| `8fb347a` | Let the calibration lean the family it generates, and never write it |
| `2256b35` | Open a life in the room its records put it in                        |
| `306a161` | Walk the creator once, and check the findings in a browser           |

This report is committed on top of those four.

---

## 2. What the human found, and where each finding is answered

Every row is a finding from the second play at `57e56c1` — the screenshots,
the PDF, and the rendered Ivan Harmon output — paired with the executable
proof that now holds it.

| #   | Finding                                                                 | Answered by                                                                               | Proof                                                                                                                        |
| --- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 1   | Title text printed on top of other title text                           | `player.css` — the negative margin a removed tagline left behind                          | `packet77-presentation.spec.ts` "puts no text on top of other text at desktop / at narrow"                                   |
| 2   | The menu covered the environment                                        | Compact right-biased translucent panel, smaller controls                                  | "leaves the room the larger part of a desktop frame" (< 34% of 1440, centre right of midline)                                |
| 3   | The title was a still picture, not a place                              | `title-ambient.ts` — ordered cycle of released character-free plates, drift and crossfade | "changes room on the fifteen-second beat, and paints only released art"; `title-ambient.test.ts` (15)                        |
| 4   | Nothing said the movement was safe                                      | The cycle reads registries only; it never touches the world                               | "consumes no world and no randomness while it drifts"                                                                        |
| 5   | Motion with no accommodation                                            | `usePrefersReducedMotion`, `data-motion` / `data-drifting`                                | "holds still for a viewer who asked for less motion"                                                                         |
| 6   | New Game broke to a blank standalone form                               | Six-stage creator inside `AmbientTableau`                                                 | "keeps the room behind New Game and behind the calibration"                                                                  |
| 7   | Kentucky / Nebraska / Alaska / Lexington laid out as default cards      | Place stage is a search, with no pre-laid default cards                                   | Walked by `tests/e2e/support/creator.ts` in every browser spec                                                               |
| 8   | Identity copy read like a form                                          | `person-identity.ts`, creator copy                                                        | `tests/character-context.test.ts` copy guards                                                                                |
| 9   | Setup questions were forced into a child's voice and exhausted the band | `itemAdmissible` gates the three openers and opens the rest                               | "opens a ten-year-old's calibration on a ten-year-old's three", "opens a child on the childhood three, then leaves the band" |
| 10  | A normal start generated a family that knew nothing about the answers   | `setup-generation-inputs.ts`, one declared seam                                           | Six proofs in §4                                                                                                             |
| 11  | No distinct custom start                                                | `NewGameStartKind`, `startKind` in the replay address                                     | "offers a normal start and a custom start, and they build differently"                                                       |
| 12  | The generated household was never introduced                            | `life-introduction.ts` + the introduction gate                                            | "introduces the generated household before the first beat"; `life-scene.test.ts`                                             |
| 13  | Play opened on a wall of headed sections                                | One moment in front; day / people / office behind `life-elsewhere`                        | "opens the life in a released home, with one moment in front"                                                                |
| 14  | The life happened nowhere                                               | `life-scene.ts` + `SceneBackdrop.tsx`                                                     | Same proof, plus "comes back to the same room and the same moment after a reload"                                            |

---

## 3. What was consumed rather than rebuilt

PR #86 is the graphics and runtime authority and this packet did not touch it.
No file under the #86 graphics surface is in the diff: not `scene-registry`,
not `visual-integration`, not the scene camera, not the raster tier, not the
character layer projection, not the art asset factory.

`SceneBackdrop.tsx` is the seam #86 itself named. `scene-consumers.ts` records
that the remaining work was "one `<SceneBackdrop sceneId={...}>` around the
existing section"; that is exactly what was built, and it consumes
`useSceneCoverTransform`, `useRasterTier`, `SCENE_REGISTRY` and
`PRODUCTION_VISUAL_LIBRARY` rather than reimplementing any of them.

---

## 4. The generation seam, and why it is narrower than it looks

Until this packet the rule was flatly that no setup answer may reach world
generation, because a political answer must not manufacture a family that
agrees with the player. The packet asks for something the old rule did not
distinguish: a **normal start generates** the household, and letting the
calibration lean that generation is not the same as letting an answer author a
canonical fact.

So the rule is narrowed, and the narrowing is written down in one module:

- The only thing about the answers that reaches generation is two integers.
  `guardianAgeLean` from `security-stability`, `siblingAgeLean` from
  `care-obligation`. Not the answers, not the question keys, not the choice
  ids, not a digest of any of them.
- Both are quantized to `[-2, +2]`. They are leans, not facts.
- Neither names a person, a date, a place or an event. Every canonical record
  is still drawn by the generator from its own RNG; the leans only move the
  range it draws from — `guardianAgeBand` and `siblingAgeGaps`.
- No answers encodes to `null`, and a world built from a skipped calibration is
  byte-identical to one built before the seam existed.
- A **custom start** declines the seam outright.

World identity did not move, and could not have. `worldSeedFor` is read _during_
the interview to choose the next question, so it cannot depend on the answers.
The generation input is a second value, `buildSeedFor`, and that is the one the
seam's encoding joins.

Six proofs hold it, in `adaptive-life.test.ts`:

| Proof                                                               | What it forbids                                                      |
| ------------------------------------------------------------------- | -------------------------------------------------------------------- |
| reproduces the same household from the same answers                 | a family that is not reproducible                                    |
| lets opposite answers build a different household                   | a seam that is decorative                                            |
| moves the household only through the declared seam                  | record kinds, order and counts differ between divergent worlds       |
| keeps the whole of the seam to two bounded leans                    | a third field being added quietly                                    |
| builds the world it always built when the calibration is skipped    | a silent change to every existing world                              |
| writes the answers where they are, and nowhere history can see them | a scan of `people` and `history` for any `questionKey` or `choiceId` |

---

## 5. Validation

All run at the pushed head, in this container.

| Check                        | Result                                                                                                                  |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `npm run validate`           | **passed** — 95 test files, **1,545 tests**, all passing; typecheck, lint, build, demo and art validation clean         |
| Full Playwright suite        | **167 passed** (5.5m), 0 failed, 0 skipped                                                                              |
| `npm run report:life` × 2    | **byte-identical** — `sha256 0e3c06dc134436f11b41e42719d8b989f5504235364fd27195bb06b6eaa469d3`, 12,810 bytes both times |
| Ownership boundary           | **4 passed** — five Packet 77 seams declared                                                                            |
| `git diff --check`           | clean                                                                                                                   |
| #86 graphics recreation scan | none — no #86-owned graphics source in the diff                                                                         |

### The eleven browser proofs

All eleven ran inside the full 167, positions 44–62:

1. no text over other text at 1440×900
2. no text over other text at 390×844
3. panel under a third of the desktop frame, right-biased, five keyboard-reachable controls
4. the fifteen-second beat (14s is not 15s; 16s is), on released art that decoded
5. no world and no randomness consumed while it drifts
6. reduced motion: `data-motion="reduced"`, `data-drifting="false"`, room still painted
7. the room behind New Game and behind the calibration
8. a normal start and a custom start that build differently
9. the generated household introduced before the first beat
10. a released home with one moment in front, and the wall behind a control
11. the same room and the same moment after a save and a reload

The fifteen-second proof drives `page.clock` rather than waiting, so "roughly
fifteen seconds" is checkable instead of something somebody watched once.

### Container note

Playwright runs through a config outside the repository. The image ships
chromium build 1194 while `@playwright/test` 1.62.1 expects 1234, so the run is
pointed at `/opt/pw-browsers/chromium` rather than downloading one. Nothing else
differs from `playwright.config.ts`, and the repository's own config is
unchanged. This is the same accommodation recorded in 72A §15.

---

## 6. Superseded tests, and why none were weakened

Five suites encoded Packet 72 rules that Packet 77 explicitly retires. None was
skipped, deleted or loosened; each was rewritten to the claim that now binds,
with the supersession recorded in its comment so it cannot quietly come back.

| Was                                                                        | Is                                                                                                                                                             |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| every question a ten-year-old could be asked belongs to the childhood band | the calibration **opens** on the age band's three, then asks what it wants — the questions are put to the player, not the character, which the screen now says |
| no setup answer may reach world generation                                 | an answer may **shape** a generated family through the declared seam and may never **author** one                                                              |
| six specs each walking their own copy of the creator                       | one walk in `tests/e2e/support/creator.ts`                                                                                                                     |

---

## 7. What is preserved

Confirmed by the suites that already held them, all still passing at this head:
age and capability semantics; relationship context; gender and pronoun records;
dialogue audibility and addressee behavior; consequences; persistence;
deterministic replay; one canonical `World`; fail-closed person-art identity
behavior. The 167-test browser suite and the 1,545-test unit suite are the
record; no assertion in either was relaxed to make room for this packet.

---

## 8. Ownership boundary

`tests/narrative-wave-ownership-boundary.test.ts` declares the five surfaces
this packet owns, against base `5f735da`:

- `src/simulation/setup-generation-inputs.ts`
- `src/presentation/title-ambient.ts`
- `src/player/TitleTableau.tsx`
- `src/player/SceneBackdrop.tsx`
- `src/presentation/life-scene.ts`, `src/presentation/life-introduction.ts`

The Packet 26 carve-out range in `tests/support/ownership-boundary.ts` is
untouched and remains frozen.

---

## 9. Scope held

Not done, deliberately, because the packet forbids each:

- no new branch and no new PR
- no rebase, no force-push, no merge
- broad Packet 73 not launched
- the full nationwide Start Anywhere adapter not implemented — the place stage
  is a search over the existing place data, not a new adapter
- #86's graphics and runtime architecture not rebuilt

---

## 10. Honest limits

- **`SETUP_GENERATION_INPUT_VERSION` is 1 and no migration exists.** A world
  saved before this head has no `generation` field, decodes to `null`, and
  therefore rebuilds exactly as it did. That is the correct behavior and it is
  also the reason no migration was written; a second version would need one.
- **The ambient cycle is as long as the neutral bank is.** It draws only from
  released, character-free plates that are in both the scene registry and the
  production library. More approved rooms lengthen it with no code change; the
  test asserts only that there is more than one.
- **Two leans is a deliberate floor, not a ceiling reached.** Other axes could
  shape other parts of a generated background. Adding one is a change to the
  seam and the test that counts its fields, which is the point.
- **The drift is CSS.** It is presentation with no runtime cost model behind it;
  on a low-end machine it is the browser's compositor that decides how smooth
  it is, and nothing in the game reacts to that.

---

## 11. Push

One head pushed to `claude/pr81-narrative-graphics-lifeflow-t8j8oe`, on top
of `57e56c1`, by fast-forward. The last code commit is `306a161`; the exact
head is the commit carrying this report, which is `306a161`'s only child. No
rebase, no force-push, no merge, no second branch.

PR #87 left **open, draft and unmerged**.

---

## 12. What Lamontae should retest

In order, on the pushed head:

| Route / screen                  | What to look at                                                                                                                                                                                 |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/` — title, desktop            | Heading and room description do not touch. Menu is a compact panel on the right; the room is most of the frame. Wait ~15s: the room changes with a crossfade, and drifts slowly while it holds. |
| `/` — title, phone              | Same screen, nothing overlapping, no sideways scroll.                                                                                                                                           |
| `/` with OS "reduce motion" on  | The room is there; it does not drift or pan.                                                                                                                                                    |
| **New Game → route**            | Two named starts: normal and custom. Not a blank form; the room is still behind it.                                                                                                             |
| **New Game → place**            | A search, not four states laid out as cards.                                                                                                                                                    |
| **New Game → character**        | Age, name, gender, pronouns. Copy that reads like a person asking, not a form.                                                                                                                  |
| **New Game → life**             | Childhood or summary, household, office.                                                                                                                                                        |
| **New Game → calibration**      | Short, deep, or skip. At age 10, the first three are a ten-year-old's; after that the questions are direct and adult-legible without pretending a child asked them.                             |
| **Begin, normal start, age 10** | The generated household is introduced _before_ anything else — each person named with what the record says they are ("your mom", "your older brother"), no machinery language.                  |
| **Play screen**                 | One moment in front. The room behind it is a real apartment/home plate. Day, people and office are behind the row of controls, not stacked on the page.                                         |
| **Save, reload, Continue**      | Same room, same moment, no second introduction.                                                                                                                                                 |
| **Custom start, same answers**  | A different life from the same seed — the calibration does not lean it.                                                                                                                         |

Answer the four in §13 while you are in there.

---

## 13. Human-only questions

These cannot be settled by a test, and are the whole of what is outstanding:

1. **Is fifteen seconds right?** It is one constant, `TITLE_AMBIENT_HOLD_MS`,
   and the browser proof reads it rather than hard-coding a number, so changing
   it is a one-line change that nothing else has to follow.
2. **Is the drift too much, or not enough?** Same: the amplitude and the pan
   distance are CSS custom properties on one keyframe block.
3. **Do the two leans shape the family in a way that reads as yours?** The
   proof shows the household _changes_ with the answers. Whether the change
   feels like it followed from what you said is a judgement only play makes.
4. **Is the introduction the right length?** It is one line per household
   member. A larger generated family makes it longer, and there is currently no
   cap.

---

## 14. Not claimed

No human acceptance. The gate at `57e56c1` was REPAIR REQUIRED / DO NOT MERGE;
this head answers the fourteen findings in §2 with executable proofs, and the
next gate is Lamontae's play, not this report.

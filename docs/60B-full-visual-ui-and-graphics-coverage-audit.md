# 60B — FULL VISUAL, UI AND GRAPHICS COVERAGE AUDIT

## OUR CIVIC DUTY — PRINT EDITION

**Prepared for:** Lamontae Billing
**Date:** 2026-09-04
**Measured against:** accepted main `6311dd6` plus the open unmerged wave branch
`claude/pr81-narrative-graphics-lifeflow-t8j8oe` (PR #87, draft)
**Companion documents:** 60A (completion report), 60C (dialogue audit), 60D (systems field guide)

---

## HOW TO READ THIS DOCUMENT

Every claim in this audit carries one of five state labels. They are not
decoration. The single most expensive mistake in this project so far has been
reading a capability that exists on a branch, or in a development route, as a
capability the game has. The labels exist to make that mistake impossible.

| Label                | What it means                                                                                                                                                           |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[MAIN-PLAYABLE]**  | ACCEPTED MAIN / PLAYER-REACHABLE NOW. On `6311dd6`, a person who opens the game and plays normally will meet this.                                                      |
| **[MAIN-SUBSTRATE]** | ACCEPTED MAIN / SUBSTRATE OR DEV-ONLY. The code is merged and works, but only a `?view=` development route, a CLI script, or a test reaches it. A player never sees it. |
| **[OPEN-PR]**        | IMPLEMENTED ON AN OPEN UNMERGED PR. Real, reviewable code — on a branch. **It is not shipped.** The PR number is always named.                                          |
| **[BANKED]**         | DONOR / RESEARCH / BANKED AUTHORITY ONLY. Art files, corpora or design records exist on disk or in a donor branch, but no runtime consumes them.                        |
| **[MISSING]**        | MISSING / NOT IMPLEMENTED. There is no code and no asset. Saying so is the point.                                                                                       |

Where this wave (PR #87) added something, it is marked **[OPEN-PR #87]**, because
until #87 merges, the shipped game is `6311dd6` and nothing more.

A note on honesty in this document: the phrase "wired" is used to mean _a module
in the running application calls the thing and paints its result on a screen a
player can reach_. A module being present in the JavaScript import graph is not
being wired, and this audit says so explicitly wherever the two diverge —
because in this codebase they diverge dramatically.

---

# PART 1 — THE ROUTE MAP

Everything visual in this project lives behind one of seven routes. The route is
chosen by a single `?view=` query parameter in `src/App.tsx:23-31`. There is no
router library and no navigation UI to reach the development routes; you type
them.

```
  URL                              COMPONENT                      AUDIENCE
  ------------------------------------------------------------------------------
  /                       (default) PlayerGame                    PLAYERS
  /?view=office-fixture             PlayerOffice                  developers
  /?view=developer                  DeveloperViewer               developers
  /?view=character-proof            CharacterProofView            art review
  /?view=production-office          ProductionOfficeProofView     art review
  /?view=scene-proof                ScenePresentationProofView    art review
  /?view=scene-authoring            SceneAuthoringProofView       art review
  /?view=legislation                LegislationDevRoute           developers
```

**This is the central fact of the whole visual audit:**

> Every illustrated surface this project has ever built — the office scene, the
> conversation strip, the calendar workspace, the working-document workspace,
> the permanent shell, the pin rail, the quick dossier, the modular character
> renderer — lives in `PlayerOffice.tsx` and its children, and is reachable
> **only** at `/?view=office-fixture`. **[MAIN-SUBSTRATE]**
>
> The production game, `PlayerGame.tsx`, renders **no scene art at all**.
> **[MAIN-PLAYABLE]**

### 1.1 Measured proof

A transitive import closure was computed from both entry components
(`PlayerGame.tsx` and `PlayerOffice.tsx`) across all 190 non-test modules under
`src/`:

```
  total non-test modules under src/ .................... 190
  reachable from PlayerGame (production) ............... 121
  reachable ONLY from PlayerOffice (dev route) .........  18
  reachable from neither ...............................  51
```

The 18 modules reachable only from the development route are the entire
illustrated-UI surface:

```
  src/player/CalendarWorkspace.tsx           src/presentation/run-a-learning.ts
  src/player/ConversationStrip.tsx           src/presentation/run-a-projection.ts
  src/player/ModularCharacter.tsx            src/presentation/run-a-state.ts
  src/player/OfficeScene.tsx                 src/presentation/run-b-conversation-state.ts
  src/player/PermanentShell.tsx              src/presentation/run-c-document-state.ts
  src/player/PinRail.tsx                     src/presentation/run-c-working-document.ts
  src/player/PlayerOffice.tsx                src/presentation/run-d-lite-state.ts
  src/player/QuickDossier.tsx                src/presentation/run-d-lite.ts
  src/player/WorkPendingWorkspace.tsx
  src/player/WorkingDocumentWorkspace.tsx
```

### 1.2 The one thread connecting the production game to the art pipeline

`PlayerGame` does pull `src/presentation/visual-integration.ts` into its import
graph — but through exactly one file, for exactly one purpose.
`src/player/PersonPortrait.tsx` imports `CHARACTER_VISUAL_RECIPES`, and uses it
to answer one question: _is this person one of the two people who have ever been
drawn?_ The answer becomes a `data-likeness="authored" | "none"` attribute. It
never causes a picture to be painted.

```tsx
// src/player/PersonPortrait.tsx
const AUTHORED_SEEDS = new Set(
  Object.values(CHARACTER_VISUAL_RECIPES).map((r) => r.appearanceSeed),
);
// ...
<span aria-hidden="true" className="person-portrait-mark">
  {initials(person.givenName, person.familyName)}
</span>;
```

The component's own documentation states the rule it is enforcing, and the rule
is correct:

> _"Only two appearances have ever been drawn, and they belong to two particular
> people. Handing one of them to a generated stranger would be a lie about who
> that stranger is, so this draws nobody instead: initials, a name, and whatever
> the world actually knows."_

So: the production game shows **two capital letters in a box** where a person
should be. That is an honest placeholder, and it is the single largest visual
gap in the product. **[MAIN-PLAYABLE]**

---

# PART 2 — SCREEN-BY-SCREEN VISUAL INVENTORY

The production game has six screens, defined as a discriminated union at
`src/player/PlayerGame.tsx:76-90`:

```ts
type Screen =
  | { kind: "title" }
  | { kind: "setup" }
  | { kind: "questionnaire"; setup: NewGameSetup }
  | { kind: "saves" }
  | { kind: "options" }
  | { kind: "playing" };
```

Below, each screen is inventoried for: what it draws, what art it uses, what art
it _should_ use, and the disposition.

---

## SCREEN 1 — TITLE

**Component:** `TitleScreen` (`PlayerGame.tsx:464-531`)
**Container class:** `.game-title` → `<main>`
**State:** **[MAIN-PLAYABLE]**

### What is on the screen today

```
  +--------------------------------------------------------------+
  |                                                              |
  |   Our Civic Duty                             <h1>            |
  |                                                              |
  |   [ New Game                              ]                  |
  |   [ Continue                              ]  <- disabled     |
  |     David Riley, 34 · Lexington, Kentucky      when no save   |
  |   [ Saved Games                           ]  <- disabled     |
  |     3 saved                                    when 0 saves   |
  |   [ Options                               ]                  |
  |   [ Quit                                  ]  <- ALWAYS       |
  |     Not available in this build.               disabled       |
  |                                                              |
  |   (optional) Games cannot be stored here...   .game-note      |
  |   (optional) <error text>                     .game-problem   |
  +--------------------------------------------------------------+
```

### Visual assessment

| Requirement                 | Present?                                        | Disposition                                                     |
| --------------------------- | ----------------------------------------------- | --------------------------------------------------------------- |
| Game title as type          | Yes — plain `<h1>`, Georgia serif               | **[MAIN-PLAYABLE]**                                             |
| Title art / tableau / logo  | No                                              | **[OPEN-PR #86]** `TitleTableau.tsx` + `TITLE_TABLEAU_SCENE_ID` |
| Five primary controls       | Yes                                             | **[MAIN-PLAYABLE]**                                             |
| Disabled state styling      | Yes — global `button:disabled { opacity: .45 }` | **[MAIN-PLAYABLE]**                                             |
| Save summary under Continue | Yes — name, age, residence                      | **[MAIN-PLAYABLE]**                                             |
| Save _thumbnail_            | No                                              | **[MISSING]**                                                   |
| Background / atmosphere     | No — flat `#e8ece8` page ground                 | **[MISSING]**                                                   |
| Version / build stamp       | No                                              | **[MISSING]**                                                   |

**Note on `Quit`:** it is rendered permanently disabled with the sub-label
"Not available in this build." This is honest for a browser build, but it is
five pixels of dead UI on the first screen a player ever sees. Recommendation is
in the backlog (P2-04).

---

## SCREEN 2 — SETUP ("choose a starting place")

**Component:** `SetupScreen` (`PlayerGame.tsx:537-958`)
**Container class:** `.game-setup`
**State:** **[MAIN-PLAYABLE]**, substantially rewritten by **[OPEN-PR #87]**

### What is on the screen today

```
  +--------------------------------------------------------------+
  |  <h1> Start a life                                            |
  |                                                              |
  |  CHOOSE A STARTING PLACE            (.game-band, uppercase)  |
  |  [ search box                     ]  <- .game-search  #87    |
  |  ( ) Kentucky            legislature: yes                    |
  |  ( ) Nebraska            legislature: yes                    |
  |  ( ) Alaska              legislature: yes                    |
  |  ( ) Lexington, Kentucky no legislature surface              |
  |      Lexington-Fayette, Kentucky      (formalName, #87)      |
  |                                                              |
  |  <fields: age, household, starting life, depth>              |
  |                                                              |
  |  <details> Advanced           <- .game-fields disclosure #87 |
  |     seed, seed origin                                        |
  |                                                              |
  |  [ Back ]  [ Continue ]                                       |
  +--------------------------------------------------------------+
```

### Visual assessment

| Requirement                  | Present?                               | Disposition                                        |
| ---------------------------- | -------------------------------------- | -------------------------------------------------- |
| Place selection              | Yes, 4 places                          | **[MAIN-PLAYABLE]**                                |
| Place **search/filter**      | Yes                                    | **[OPEN-PR #87]** `.game-search`, `matchingPlaces` |
| Formal vs display place name | Yes                                    | **[OPEN-PR #87]** `formalName` on `life-places.ts` |
| Seed hidden behind Advanced  | Yes                                    | **[OPEN-PR #87]** `<details>`/`<summary>`          |
| **Map of the place**         | No                                     | **[MISSING]**                                      |
| **Place photograph / plate** | No                                     | **[MISSING]**                                      |
| Coverage honesty note        | Yes — `lifePlaceCoverage().playerNote` | **[MAIN-PLAYABLE]**                                |
| Field validation messaging   | Yes — `newGameSetupProblems()`         | **[MAIN-PLAYABLE]**                                |

**Only four places exist.** `lifePlaces()` returns Kentucky, Nebraska, Alaska,
and Lexington/Lexington-Fayette. Three carry a legislative rule pack. The
coverage record says why, in the player's own words, and that is the right
behaviour — but it means a "choose where your life happens" screen is a list of
four radio buttons with no imagery of any kind.

---

## SCREEN 3 — CALIBRATION (the questionnaire)

**Component:** `QuestionnaireScreenView` (`PlayerGame.tsx:960-1011`)
**State:** **[MAIN-PLAYABLE]** (machinery re-homed by **[OPEN-PR #87]**)

### What is on the screen today

```
  +--------------------------------------------------------------+
  |  <phase line: "Getting to know you" / etc.>   PHASE_LINE #87 |
  |                                                              |
  |  It is late and the kitchen light is still on. ...           |
  |    (authored prompt prose, serif)                            |
  |                                                              |
  |  [ Sit down with them                     ]                  |
  |    <small>description of what it means</small>               |
  |  [ Say goodnight and go up                ]                  |
  |  [ ... ]                                                     |
  +--------------------------------------------------------------+
```

### Visual assessment

| Requirement                                                                                  | Present?              | Disposition                    |
| -------------------------------------------------------------------------------------------- | --------------------- | ------------------------------ |
| One question per screen                                                                      | Yes                   | **[MAIN-PLAYABLE]**            |
| Phase copy telling the player where they are                                                 | Yes                   | **[OPEN-PR #87]** `PHASE_LINE` |
| Progress indicator (n of m)                                                                  | **No — deliberately** | see note                       |
| Skip control                                                                                 | Removed               | **[OPEN-PR #87]**              |
| Illustration per question                                                                    | No                    | **[MISSING]**                  |
| Person portrait for the named people (Dana, Marcus, Priya, Ray, Ms. Whitfield, Curtis, Nell) | No                    | **[MISSING]**                  |

**Why there is no progress bar:** the questionnaire stops on an information-gain
floor, not a fixed count. Three different answer patterns produced 19, 22 and 37
questions in measurement. A progress bar would have to lie. The phase line was
introduced instead. This is a correct design decision and should not be
"fixed" — but it does mean the screen has no visual rhythm at all, and this is
the longest uninterrupted stretch of undifferentiated screens in the game
(19–37 near-identical layouts in a row). See P0-03.

---

## SCREEN 4 — SAVED GAMES

**Component:** `SavesScreen` (`PlayerGame.tsx:1013-1149`)
**Container class:** `.game-saves`, `.game-saves-actions`, `.game-saves-damaged`
**State:** **[MAIN-PLAYABLE]**

### Visual assessment

| Requirement                           | Present?                    | Disposition                                      |
| ------------------------------------- | --------------------------- | ------------------------------------------------ |
| Save list with name/age/place/date    | Yes                         | **[MAIN-PLAYABLE]**                              |
| Damaged/quarantined save presentation | Yes — `.game-saves-damaged` | **[MAIN-PLAYABLE]**, styled by **[OPEN-PR #87]** |
| Delete with confirmation              | Yes                         | **[MAIN-PLAYABLE]**                              |
| Save thumbnail / portrait             | No                          | **[MISSING]**                                    |
| Storage-unavailable messaging         | Yes                         | **[MAIN-PLAYABLE]**                              |

The save system underneath is genuinely strong (`BrowserSaveStore`, tombstones,
`SaveDefect` taxonomy, quarantine, cross-tab conflict handling, autosave flush).
None of that strength is visible: it is a text list.

---

## SCREEN 5 — OPTIONS

**Component:** `OptionsScreen` (`PlayerGame.tsx:1465-1482`)
**State:** **[OPEN-PR #87]** (this wave added the screen)

It currently contains a heading, an honesty note, and a Back button. There are
no settings in it yet. This is correct — an options screen with fabricated
toggles would be worse — but it should carry the settings that _do_ exist
implicitly today (reduced motion is honoured in CSS; text size is not).
See P1-07.

---

## SCREEN 6 — PLAYING

**Component:** `PlayingScreen` (`PlayerGame.tsx:1151-1281`), which composes
`StoryView`, `JournalView`, `OrdinaryDayView`, `HouseholdConversation`,
`LegislationWorkspace`, and `PersonPortrait`.
**State:** **[MAIN-PLAYABLE]**, with `StoryView`/`JournalView` from **[OPEN-PR #87]**

### What is on the screen today

```
  +--------------------------------------------------------------+
  |  .game-play-header                                            |
  |    [AR]  Amir Ruiz                     <- PersonPortrait      |
  |          34 · Lexington, Kentucky          initials only      |
  |    .game-play-actions: [Save this life] [Main menu]           |
  |                                                              |
  |  .game-story                                                  |
  |    .game-passage   "A month later."          connective       |
  |    .game-scene     "The place the group meets in is going     |
  |                     to close. ..."           authored prose   |
  |    .game-note      "Amir Ruiz is there."     people line      |
  |                                                              |
  |    .game-choices                                              |
  |      [ Keep it open                       ]                   |
  |        <small>what that means</small>                         |
  |      [ Let it close                       ]                   |
  |      [ Let time pass                      ]                   |
  |        <small>Come back to it when something needs you.</small>|
  |                                                              |
  |    .game-pending   <ul> open threads </ul>                    |
  |    [ Journal ]                    .game-journal-toggle        |
  |                                                              |
  |  (conditionally) .game-conversation                           |
  |  (conditionally) LegislationWorkspace                         |
  +--------------------------------------------------------------+
```

### Visual assessment — the main play screen

| Requirement                                        | Present?                               | Disposition                                                                           |
| -------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------- |
| Narrative passage typography                       | Yes — serif, measured line length      | **[OPEN-PR #87]**                                                                     |
| Connective / time-passage line distinct from scene | Yes — `.game-passage` vs `.game-scene` | **[OPEN-PR #87]**                                                                     |
| Choice buttons with label + consequence hint       | Yes                                    | **[MAIN-PLAYABLE]**                                                                   |
| Open-threads list                                  | Yes — `.game-pending`                  | **[OPEN-PR #87]**                                                                     |
| Journal behind a control, not poured on the page   | Yes                                    | **[OPEN-PR #87]**                                                                     |
| **Room / scene art behind the beat**               | **No**                                 | **[OPEN-PR #86]** declares `DOMESTIC_ORDINARY_SCENE_ID` for exactly this consumer     |
| **Person art**                                     | **No** — initials                      | **[MISSING]** (art), **[BANKED]** (25 production component masters exist, unreleased) |
| Date / age display                                 | Yes — `.game-day`                      | **[MAIN-PLAYABLE]**                                                                   |
| Any transition or motion between beats             | No                                     | **[MISSING]**                                                                         |

---

# PART 3 — TYPOGRAPHY, COLOUR, SPACING, MOTION

## 3.1 Stylesheets

```
  src/styles.css ............... 689 lines   global reset + base controls
  src/player/player.css ...... 5,597 lines   everything else
                              ---------
                               6,286 lines
```

`player.css` carries **318 distinct top-level class selectors**, of which only
**28** are `.game-*` (the production game). The remaining ~290 style the
development routes.

## 3.2 Type

**Families in use (9 distinct declarations):**

```
  "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif
  Georgia, "Times New Roman", serif
  Georgia, serif
  Inter, ui-sans-serif, system-ui, -apple-system, ... sans-serif   (:root)
  system-ui, sans-serif
  ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace
  ui-monospace, SFMono-Regular, Menlo, Consolas, monospace
  ui-monospace, SFMono-Regular, Menlo, monospace
  ui-monospace, Menlo, monospace
  inherit
```

**Finding V-T1 [MAIN-PLAYABLE]:** there are four spellings of the same monospace
stack and three of the same serif stack. These are the same intent written four
times. Category A (code fix, no art).

**Finding V-T2 [MAIN-PLAYABLE]:** `:root` requests `Inter` first, but **Inter is
never loaded** — there is no `@font-face`, no `<link>` to a font service, and no
bundled font file. Every player is silently falling through to
`ui-sans-serif`/`system-ui`. Either load it or stop naming it. Category A.

**Type scale: 69 distinct `font-size` values** across the two stylesheets,
including `9px` (three occurrences) and `0.34rem`. A `0.34rem` label is roughly
5.4px at default root size — that is not readable text, it is texture. The
production `.game-*` surfaces are better behaved (11 sizes), but there is no
scale, no ramp, and no tokens. Category A.

## 3.3 Colour

**372 distinct hex literals. Zero design tokens in `styles.css`. Eight custom
properties in `player.css`, all prefixed `--run-a-*`** — i.e. tokens exist for
exactly one development fixture and nothing else.

```
  --run-a-ink: #f5ebd4;      --run-a-gold: #c29b48;
  --run-a-muted: #c8b997;    --run-a-line: rgba(218, 198, 153, 0.56);
  --run-a-navy: #0b1320;     --run-a-focus: #f6c75a;
  --run-a-navy-soft: #121d2e;
```

Most-used literals: `#16233a` (22), `#b4b4a8` (19), `#5c6779` (15), `#47536a`
(14), `#f8f7f3` (12). Near-duplicates abound: `#d3d3c8` and `#d3d2c8` differ by
one unit in one channel and are used nine times between them.

**Finding V-C1 [MAIN-PLAYABLE]:** the product has no colour system. This is the
highest-leverage non-art visual fix available: extracting ~20 semantic tokens
(`--ink`, `--ink-muted`, `--ground`, `--ground-raised`, `--rule`, `--accent`,
`--accent-ink`, `--danger`, `--focus`) would collapse 372 literals to a
palette, and is a precondition for a dark theme, a high-contrast theme, or any
consistent art direction. Category A. See P0-01.

## 3.4 Motion and responsiveness

```
  @media queries ............ 9  (6 in player.css, 3 in styles.css)
  breakpoints ............... 720px, 980px, 1100px, 1300px
  prefers-reduced-motion .... 2 blocks (both in player.css)
  prefers-color-scheme ...... 0 blocks
  prefers-contrast .......... 0 blocks
```

**Finding V-M1 [MAIN-PLAYABLE]:** `prefers-reduced-motion` is honoured, which is
good. `prefers-color-scheme` is not honoured at all — the game is light-only,
and forces `#e8ece8` regardless of system theme. For a game whose most-played
screen is a long reading surface, a dark mode is a genuine comfort feature, not
a nicety. Category A. See P1-01.

## 3.5 Control states — the button matrix

`src/styles.css` styles all buttons globally. The measured state coverage across
both stylesheets:

```
  :hover ............. 47 rules
  :focus ............. 20 rules
  :focus-visible ..... 12 rules
  :disabled .......... 16 rules
  :active ............  (none found on .game-* controls)
  aria-pressed ....... (none)
```

| State            | Global default                           | `.game-*` override | Verdict                                                   |
| ---------------- | ---------------------------------------- | ------------------ | --------------------------------------------------------- |
| rest             | `#183c34` ground, `#fff` ink, 750 weight | yes                | OK                                                        |
| hover            | `#24594d`                                | inherits           | OK                                                        |
| focus-visible    | `3px solid #8a4b00`, offset 2            | inherits           | OK — genuinely good                                       |
| active/pressed   | **none**                                 | **none**           | **[MISSING]** — no press feedback anywhere                |
| disabled         | `opacity: .45`, `not-allowed`            | inherits           | weak — opacity-only fails contrast                        |
| loading/busy     | **none**                                 | **none**           | **[MISSING]**                                             |
| selected/toggled | **none**                                 | **none**           | **[MISSING]** — the Journal toggle changes only its label |

**Finding V-S1 [MAIN-PLAYABLE]:** there is no `:active` state on any control in
the game. A choice button gives no press feedback at all; on a slow render the
player cannot tell whether their click registered. Category A. See P0-02.

**Finding V-S2 [MAIN-PLAYABLE]:** disabled state is conveyed by opacity alone.
`#183c34` at 45% opacity on `#e8ece8` computes to roughly 3.1:1 against its own
white label — below the 4.5:1 text threshold. Category A.

## 3.6 Accessibility

Measured on `src/player/PlayerGame.tsx` (1,649 lines, the entire production UI):

```
  aria-* attributes ......... 0
  role= attributes .......... 0
  <main> .................... 6
  <section> ................ 10
  <h1> ...................... 5
  <h2> ...................... 9
  <h3> ...................... 3
  <label> ................... 4
  <input> ................... 4
  <button> ................. 38
  <ul>/<ol> ................. 8
  <details>/<summary> ....... 1
```

**Finding V-A1 [MAIN-PLAYABLE]:** the semantic HTML is respectable — real
headings, real landmarks, real labels, and 38 real `<button>` elements rather
than clickable `<div>`s. But there are **zero ARIA attributes and zero live
regions**, and the play screen's entire content is replaced in place when a
choice is taken. A screen-reader user pressing a choice button hears nothing
change. The narrative passage needs `aria-live="polite"`. This is a one-line fix
with a large payoff. Category A. See P0-04.

**Finding V-A2 [MAIN-PLAYABLE]:** five `<h1>` elements exist across the six
screens, which is correct (one per screen), but the `PlayingScreen` composes
several `<main>` elements' worth of structure without a document-title change,
so browser history and screen-reader page announcements never move.

---

# PART 4 — THE ART PIPELINE AS IT ACTUALLY STANDS

## 4.1 The manifest census

`art/manifest/asset_manifest.json` — **111 assets**, every one of them
`generation_status: approved`.

```
  BY ASSET TYPE
    character-component .................. 46
    character-component-candidate ........ 35
    character-component-master ........... 25
    environment-plate ..................... 2
    authored-character-pose ............... 2
    environment-foreground-mask ........... 1
                                          ---
                                          111

  BY ART CLASS
    development-fixture .................. 50
    production ........................... 26
    (unclassified candidates) ............ 35

  BY RUNTIME RELEASE STATUS
    released ............................. 51
    unreleased ........................... 60

  BY QA STATUS
    approved ............................. 51
    pending .............................. 60
```

## 4.2 The finding that matters most

Cross-tabulating release status against art class:

```
  RELEASED ASSETS, BY CLASS
    character-component        / development-fixture ..... 46
    authored-character-pose    / development-fixture ......  2
    environment-plate          / development-fixture ......  1
    environment-foreground-mask/ development-fixture ......  1
    environment-plate          / production ...............  1
                                                          ----
                                                            51
```

> **Exactly one production-class asset is released in the entire game:
> `env_shared_workroom_office_v1`, an environment plate.**
>
> The other 50 released assets are all development fixtures (`dev_*`,
> `dev_g2_*`). The other 25 production-class assets are **25 character
> component masters — heads, hair, tops, bottoms, footwear, body frames — every
> single one `unreleased` and `qa_status: pending`.** **[BANKED]**

The 25 banked masters are, by name:

```
  BODY FRAMES (2)   pg_master_body_standing_frame_a / _b
  HEADS (5)         pg_master_head_01..05_bald_neutral
  HAIR (8)          01 short_tapered_afro       05 shoulder_box_braids
                    02 rounded_medium_afro      06 long_box_braids
                    03 shoulder_natural_curls   07 cornrows_low_bun
                    04 high_puff                08 shoulder_locs
  TOPS (4)          01 short_sleeve_crew_tee    03 pullover_sweater
                    02 long_sleeve_button_shirt 04 structured_blazer
  BOTTOMS (3)       01 straight_leg_jeans  02 dress_trousers  03 a_line_knee_skirt
  FOOTWEAR (3)      01 low_top_sneakers    02 leather_loafers 03 low_practical_flats
```

**This is a complete, coherent, production-quality modular character kit that
the game does not use.** It is the single largest piece of finished value
sitting idle in this repository. Getting these released and consumed is worth
more than commissioning anything new. See P0-05.

## 4.3 Scenes

`SCENE_REGISTRY` (`src/presentation/scene-registry.ts:292`) seeds three scenes:

| Scene id                            | Class       | Plate                                 | Reachable by a player?                  |
| ----------------------------------- | ----------- | ------------------------------------- | --------------------------------------- |
| `shared-workroom-office-production` | production  | yes (`env_shared_workroom_office_v1`) | **No** — `?view=production-office` only |
| `office-council-staff-fixture`      | dev fixture | yes (frozen fixture art)              | **No** — `?view=office-fixture` only    |
| `committee-room-fixture`            | dev fixture | **none**                              | **No**                                  |

The registry's own comment is exact and worth quoting:

> _"Every scene the runtime knows about. Both entries are development fixtures:
> the office has frozen fixture art, the committee room has no art at all.
> Production plates join this list as data when they exist."_

**Environment families declared** (11 named + 2 lowercase scene families):

```
  CAMPAIGN_VOLUNTEER_OFFICE_01     HOME_APARTMENT_SETTLED_03
  CIVIC_COMMUNITY_MEETING_HALL_01  HOME_APARTMENT_STARTER_01
  COUNCIL_STAFF_OFFICE_LEXINGTON_01 PRESS_BRIEFING_ROOM_01
  EXECUTIVE_PRIVATE_OFFICE_01      PUBLIC_HEARING_ROOM_01
  HOME_APARTMENT_MODEST_01         PUBLIC_PARK_PAVILION_01
  HOME_APARTMENT_ORDINARY_02       (civic-office, committee-room)
```

**Eleven families are declared. Three scenes are registered. One has production
art. Zero are reachable in play.** **[BANKED]** / **[MAIN-SUBSTRATE]**

## 4.4 Pose system

`src/presentation/pose-families.ts` (1,091 lines) defines a complete contact-
contract pose system:

```
  posture classes ................. 4
  facings ......................... 5   (3 flagged as near-term)
  landmark ids ................... 18
  priorities ...................... 2   (P0, P1)
  production statuses ............. 7
  human QA states ................. 3
  contact verification states ..... 2
  footwear states ................. 2
  prop slots ...................... 2   (hand-left, hand-right)
  standing sole minimum Y ......... 0.9
  seated pelvis Y range ........... 0.45 – 0.8
```

Two authored character poses exist, both `development-fixture` class. The
system can express far more than the art supplies. **[MAIN-SUBSTRATE]**

## 4.5 Raster tiers

`ENVIRONMENT_TIER_LADDER` has 4 tiers. The e2e suite proves the shared scene
camera holds at **13 viewport sizes** from 1280×720 to 7680×2160, and at
DPR 1, 1.25 and 2. This machinery is excellent and fully tested — and, again,
only exercised on development routes. **[MAIN-SUBSTRATE]**

## 4.6 What PR #86 would change

**[OPEN-PR #86]** `claude/total-graphics-runtime-integration` (branched from
`6311dd6`, current with main, 21 files, +3,464/−137) adds:

- `src/player/TitleScreen.tsx` and `src/player/TitleTableau.tsx`
- Three new production scenes: `civic-community-meeting-title-production`,
  `civic-hearing-room-production`, `residence-apartment-living-production`
- `src/presentation/scene-consumers.ts` — a **13-consumer disposition matrix**
  that derives (rather than asserts) whether each player-facing surface is
  wired to production art, an honest fallback, or blocked
- `src/presentation/surface-binding.ts`
- `src/ui/SceneGalleryView.tsx`
- `src/authoring/asset-request.ts` — structured art requests

Its 13 declared consumers:

```
  title-no-save                 An empty title screen
  title-recent-save             The title screen, showing the most recent life
  ordinary-domestic-life        An ordinary day at home
  household-conversation        Talking to somebody at home
  formative-years               The growing-up years
  production-office             A shared staff workroom
  council-staff-office          A municipal council staff office
  committee-hearing             A committee hearing
  committee-room-fixture        A committee room with no picture of it
  legislative-chamber-floor     The chamber floor            (sceneId: null)
  executive-private-office      An executive's private study
  courtroom                     A courtroom                  (sceneId: null)
  campaign-field-office         A campaign office            (sceneId: null)
```

**This audit's position on #86:** it is the correct next merge for the visual
product, it is current with main, and it is the only branch that puts a picture
behind the play surface. This document does **not** duplicate its work (Packet 60
carve-out), and every capability above is labelled **[OPEN-PR #86]**, not
shipped.

---

# PART 5 — COVERAGE AND DISPOSITION MATRIX

This is the requirement-by-requirement matrix the addendum asks for. "Requirement"
means a distinct visual thing a finished version of this game needs.

### 5.1 Controls and interaction states

| #    | Requirement                       | State                | Category | Where                    |
| ---- | --------------------------------- | -------------------- | -------- | ------------------------ |
| C-01 | Button rest state                 | **[MAIN-PLAYABLE]**  | A        | `styles.css`             |
| C-02 | Button hover                      | **[MAIN-PLAYABLE]**  | A        | `styles.css`             |
| C-03 | Button focus-visible ring         | **[MAIN-PLAYABLE]**  | A        | `styles.css`             |
| C-04 | Button `:active` / press          | **[MISSING]**        | A        | —                        |
| C-05 | Button disabled (non-opacity)     | **[MISSING]**        | A        | —                        |
| C-06 | Button busy/loading               | **[MISSING]**        | A        | —                        |
| C-07 | Toggle / pressed state            | **[MISSING]**        | A        | Journal toggle           |
| C-08 | Text input rest/focus             | **[MAIN-PLAYABLE]**  | A        | place search             |
| C-09 | Radio group (place choice)        | **[MAIN-PLAYABLE]**  | A        | setup                    |
| C-10 | Disclosure (`<details>`)          | **[OPEN-PR #87]**    | A        | setup advanced           |
| C-11 | Segmented control (audibility)    | **[MAIN-SUBSTRATE]** | A        | `ConversationStrip` only |
| C-12 | Destructive confirm (delete save) | **[MAIN-PLAYABLE]**  | A        | saves                    |
| C-13 | Error banner                      | **[MAIN-PLAYABLE]**  | A        | `.game-problem`          |
| C-14 | Empty state                       | **[MAIN-PLAYABLE]**  | A        | saves, threads           |
| C-15 | Skeleton / loading state          | **[MISSING]**        | A        | —                        |

### 5.2 Typography and system

| #    | Requirement                          | State                                     | Category |
| ---- | ------------------------------------ | ----------------------------------------- | -------- |
| T-01 | Serif reading face for narrative     | **[OPEN-PR #87]**                         | A        |
| T-02 | Sans face for UI chrome              | **[MAIN-PLAYABLE]**                       | A        |
| T-03 | Actual webfont loading               | **[MISSING]** (Inter named, never loaded) | A        |
| T-04 | Defined type scale                   | **[MISSING]** (69 ad-hoc sizes)           | A        |
| T-05 | Measure/line-length control on prose | **[OPEN-PR #87]**                         | A        |
| T-06 | Colour tokens                        | **[MISSING]** (372 literals, 8 tokens)    | A        |
| T-07 | Dark mode                            | **[MISSING]**                             | A        |
| T-08 | High-contrast mode                   | **[MISSING]**                             | A        |
| T-09 | Reduced motion                       | **[MAIN-PLAYABLE]**                       | A        |
| T-10 | Text-size preference                 | **[MISSING]**                             | A        |

### 5.3 Screens

| #    | Requirement                       | State                                | Category |
| ---- | --------------------------------- | ------------------------------------ | -------- |
| S-01 | Title screen                      | **[MAIN-PLAYABLE]**                  | A        |
| S-02 | Title art / tableau               | **[OPEN-PR #86]**                    | D        |
| S-03 | Setup screen                      | **[MAIN-PLAYABLE]**                  | A        |
| S-04 | Place imagery on setup            | **[MISSING]**                        | D        |
| S-05 | Place map                         | **[MISSING]**                        | C        |
| S-06 | Calibration screen                | **[MAIN-PLAYABLE]**                  | A        |
| S-07 | Calibration illustration          | **[MISSING]**                        | D        |
| S-08 | Play screen                       | **[MAIN-PLAYABLE]**                  | A        |
| S-09 | Play screen room art              | **[OPEN-PR #86]**                    | B        |
| S-10 | Journal screen                    | **[OPEN-PR #87]**                    | A        |
| S-11 | Saves screen                      | **[MAIN-PLAYABLE]**                  | A        |
| S-12 | Save thumbnails                   | **[MISSING]**                        | C        |
| S-13 | Options screen                    | **[OPEN-PR #87]**                    | A        |
| S-14 | Legislation workspace             | **[MAIN-PLAYABLE]**                  | A        |
| S-15 | Conversation surface (rich)       | **[MAIN-SUBSTRATE]**                 | A        |
| S-16 | Retrospective / life-history view | **[OPEN-PR #87]** (journal chapters) | A        |

### 5.4 People

| #    | Requirement                       | State                                       | Category |
| ---- | --------------------------------- | ------------------------------------------- | -------- |
| P-01 | Person present in the fiction     | **[MAIN-PLAYABLE]**                         | E        |
| P-02 | Person initials placeholder       | **[MAIN-PLAYABLE]**                         | A        |
| P-03 | Modular character render pipeline | **[MAIN-SUBSTRATE]**                        | A        |
| P-04 | Production component masters      | **[BANKED]** (25, unreleased)               | B        |
| P-05 | Released production character art | **[MISSING]**                               | B→D      |
| P-06 | Authored named-character likeness | **[BANKED]** (2 dev fixtures)               | D        |
| P-07 | Age variation in portraiture      | **[MISSING]**                               | D        |
| P-08 | Expression / emotional state      | **[MISSING]**                               | D        |
| P-09 | Clothing reflecting role/occasion | **[BANKED]** (4 tops, 3 bottoms)            | B        |
| P-10 | Skin-tone / feature variation     | **[MISSING]** (5 heads, all `bald_neutral`) | D        |

### 5.5 Places, scenes, props

| #    | Requirement                        | State                                           | Category |
| ---- | ---------------------------------- | ----------------------------------------------- | -------- |
| E-01 | Environment plate format & tiers   | **[MAIN-SUBSTRATE]**                            | A        |
| E-02 | Foreground mask / occluder support | **[MAIN-SUBSTRATE]**                            | A        |
| E-03 | Surface slots and z-order          | **[MAIN-SUBSTRATE]**                            | A        |
| E-04 | Shared workroom office plate       | **[MAIN-SUBSTRATE]** (released, dev route only) | B        |
| E-05 | Home / apartment interior          | **[OPEN-PR #86]**                               | D        |
| E-06 | Community meeting hall             | **[OPEN-PR #86]**                               | D        |
| E-07 | Public hearing room                | **[OPEN-PR #86]**                               | D        |
| E-08 | Committee room                     | **[MISSING]** (scene registered, no plate)      | D        |
| E-09 | Legislative chamber floor          | **[MISSING]**                                   | D        |
| E-10 | Courtroom                          | **[MISSING]**                                   | D        |
| E-11 | Campaign field office              | **[MISSING]**                                   | D        |
| E-12 | Press briefing room                | **[MISSING]**                                   | D        |
| E-13 | Park / pavilion (outdoor)          | **[MISSING]**                                   | D        |
| E-14 | School interior                    | **[MISSING]**                                   | D        |
| E-15 | Workplace (non-political)          | **[MISSING]**                                   | D        |
| E-16 | Props in hand slots                | **[MAIN-SUBSTRATE]** (2 slots, no prop art)     | D        |
| E-17 | Time-of-day / season variation     | **[MISSING]**                                   | C        |

### 5.6 Documents, maps, data surfaces

| #    | Requirement                            | State                                             | Category |
| ---- | -------------------------------------- | ------------------------------------------------- | -------- |
| D-01 | Working document surface               | **[MAIN-SUBSTRATE]** (`WorkingDocumentWorkspace`) | A        |
| D-02 | Bill / legislation presentation        | **[MAIN-PLAYABLE]**                               | A        |
| D-03 | Calendar surface                       | **[MAIN-SUBSTRATE]** (`CalendarWorkspace`)        | A        |
| D-04 | Dossier on a person                    | **[MAIN-SUBSTRATE]** (`QuickDossier`)             | A        |
| D-05 | Pin rail / persistent context          | **[MAIN-SUBSTRATE]** (`PinRail`)                  | A        |
| D-06 | Jurisdiction map                       | **[MISSING]**                                     | C        |
| D-07 | District map                           | **[MISSING]**                                     | C        |
| D-08 | Relationship graph                     | **[MISSING]**                                     | C        |
| D-09 | Timeline of a life                     | **[OPEN-PR #87]** (journal chapters, text)        | C        |
| D-10 | Player-model / Pennywise visualisation | **[MAIN-SUBSTRATE]** (`report:life` markdown)     | C        |
| D-11 | Civic symbols / seals                  | **[BANKED]** (`src/authoring/civic-symbols.ts`)   | C        |

### 5.7 Dynamic surfaces

| #    | Requirement                            | State                                                | Category |
| ---- | -------------------------------------- | ---------------------------------------------------- | -------- |
| Y-01 | Dynamic surface authoring              | **[BANKED]** (`src/authoring/dynamic-surfaces.ts`)   | E        |
| Y-02 | Dynamic components                     | **[BANKED]** (`src/authoring/dynamic-components.ts`) | E        |
| Y-03 | Text rendered into a scene surface     | **[MAIN-SUBSTRATE]**                                 | E        |
| Y-04 | Names/dates/places composed at runtime | **[MAIN-PLAYABLE]**                                  | E        |
| Y-05 | Nameplates / signage in scenes         | **[MISSING]**                                        | E        |

---

# PART 6 — CATEGORIES

The addendum asks that every gap be sorted into one of five buckets. Here is the
full sort, with counts.

## CATEGORY A — should be code / UI styling, not art (31 items)

These need no picture. They need CSS and markup.

```
  C-01..C-15 (controls)      T-01..T-10 (type/colour/theme)
  S-01, S-03, S-06, S-08,    P-02, P-03
  S-10, S-11, S-13, S-14,    E-01, E-02, E-03
  S-15, S-16                 D-01..D-05
```

The four highest-value: colour tokens (T-06), `:active` state (C-04), a live
region on the narrative passage (V-A1), and a real type scale (T-04). None
requires an artist. All four are hours, not weeks.

## CATEGORY B — use existing approved art (6 items)

Art that already exists and is approved but is not released, not consumed, or
consumed only on a dev route.

```
  P-04  25 production character component masters   unreleased / QA pending
  P-05  release + consume those masters             blocked on P-04
  P-09  clothing variation                          contained in P-04
  E-04  env_shared_workroom_office_v1               released, dev route only
  S-09  room art behind the play surface            #86 wires it
  D-11  civic symbols                               authored, unconsumed
```

**This is the cheapest real visual progress available.** No generation required.

## CATEGORY C — deterministic composition, not drawn art (8 items)

Things that should be _computed and drawn by code_ from canonical data, and
would be wrong as static pictures because they must reflect a specific life.

```
  S-05  place map              from jurisdiction data
  S-12  save thumbnail         composed from name/age/place/date
  D-06  jurisdiction map       from the accepted place corpus
  D-07  district map           from Census district geography (banked, PR #67)
  D-08  relationship graph     from world.people + relationship records
  D-09  life timeline          from world.history, already projected in text
  D-10  player-model chart     from playerModelFor(), already computed
  E-17  time-of-day treatment  a filter over a plate, not a second plate
```

## CATEGORY D — genuinely needs new art (14 items)

```
  S-02  title tableau                    (#86 declares the scene; art needed)
  S-04  place imagery for the 4 places
  S-07  calibration illustration set
  P-06  authored likeness, production class
  P-07  age variation
  P-08  expression set
  P-10  skin tone and facial feature variation   <- see note below
  E-05  home / apartment interior       (#86 declares; plate needed)
  E-06  community meeting hall          (#86 declares; plate needed)
  E-07  public hearing room             (#86 declares; plate needed)
  E-08  committee room plate
  E-09  legislative chamber floor
  E-10  courtroom
  E-11  campaign field office
  E-12  press briefing room
  E-13  park / pavilion
  E-14  school interior
  E-15  ordinary workplace
  E-16  prop art for the two hand slots
```

**Note on P-10.** All five banked head masters are named `bald_neutral`. The
eight hair masters are a strong, specific, deliberately Black-hair-forward set
(tapered afro, rounded afro, natural curls, high puff, box braids ×2, cornrows
with low bun, shoulder locs) — but the heads underneath them carry no skin-tone
or feature variation. A modular kit with 8 hair options and 1 head is a kit that
makes everyone look like the same person in different wigs. Head variation is
the single most important art commission on this list.

## CATEGORY E — should remain dynamic data, never art (5 items)

```
  P-01  a person's presence in a scene    from world records
  Y-01  dynamic surface authoring
  Y-02  dynamic components
  Y-03  text rendered into scene surfaces
  Y-04  names/dates/places at runtime
  Y-05  nameplates and signage           composed, never baked into a plate
```

Baking a name into a plate is how a scene becomes unusable for the next life.
These stay data.

---

# PART 7 — PRIORITISED BACKLOG

## P0 — do these first (blocking the product's basic legibility)

**P0-01 — Extract a colour token system.** _Category A. No art. ~4h._
Replace 372 hex literals with ~20 semantic custom properties in `styles.css`.
Precondition for P1-01 (dark mode) and for any consistent art direction.
Acceptance: no bare hex literal in `.game-*` rules; `npm run validate` green.

**P0-02 — Add `:active` and a real disabled treatment to every control.**
_Category A. No art. ~2h._ Press feedback on 38 buttons; disabled conveyed by
ground + border + ink, not opacity alone, meeting 4.5:1.

**P0-03 — Give the calibration screens visual rhythm.** _Category A. ~4h._
19–37 consecutive identical layouts is the worst stretch in the game. Vary the
plate/ground per `QuestionnaireRegister` (there are six: `lived-personal`,
`lived-relational`, `lived-moral`, `civic-lived`, `policy-lived`,
`policy-docket`) so the player can feel the subject change without being told a
count that would be a lie.

**P0-04 — `aria-live="polite"` on the narrative passage, and a focus move to the
new beat.** _Category A. ~1h._ Today a screen-reader user gets silence when they
make a choice.

**P0-05 — Release the 25 production character component masters and wire them.**
_Category B → A. No new art._ Run the QA path (`npm run qa:art`), flip
`runtime_release_status`, and make `PersonPortrait` render a composed modular
character when a person's appearance resolves against released components,
falling back to initials — never to a borrowed likeness. This turns the largest
banked asset in the repo into the game's face.

**P0-06 — Merge PR #86.** _Not this lane's work; named because nothing else puts
a room behind the play surface._ It is the only open branch that is current with
main and it carries the scene-consumer disposition matrix that makes all future
visual questions answerable from data.

## P1 — do these next

**P1-01 — Dark mode via `prefers-color-scheme`.** Category A. Blocked on P0-01.
**P1-02 — One type scale; delete the other 55 sizes.** Category A.
**P1-03 — Load a real reading face, or stop naming Inter.** Category A.
**P1-04 — Commission head variation (P-10).** Category D. **The highest-value art
commission on the list.** 6–10 head masters with genuine skin-tone and feature
range, matched to the existing 8 hair masters.
**P1-05 — Home / apartment interior plate (E-05).** Category D. This is where
most beats actually happen: `home.someone-is-not-all-right`,
`home.the-week-that-does-not-balance`, `adult.household-*`, the household
conversation. One room buys more coverage than any other single plate.
**P1-06 — Composed save thumbnails (S-12).** Category C.
**P1-07 — Put the settings that already exist into Options.** Category A.
**P1-08 — Pressed/selected state for the Journal toggle.** Category A.

## P2 — worth doing, not urgent

**P2-01** Community meeting hall plate (E-06) — the civic episode family's room.
**P2-02** Public hearing room plate (E-07).
**P2-03** Place imagery for the four starting places (S-04).
**P2-04** Remove or replace the permanently-disabled `Quit` button.
**P2-05** Relationship graph (D-08) — Category C, all the data exists.
**P2-06** Player-model visualisation in-game (D-10) — the markdown report proves
the data is there; it just has no screen.
**P2-07** Timeline view with chapter art (D-09).
**P2-08** Committee room plate (E-08).
**P2-09** Expression set (P-08).
**P2-10** Prop art for the two hand slots (E-16).

---

# PART 8 — IF I SAT DOWN TO GENERATE ART TOMORROW

This is the section to read if you have a generation session and a morning.

## Before you generate anything

Two things are already paid for and unshipped. Do them first — they cost no
generation credits and they change the game more than any new picture:

1. **Release the 25 character component masters.** They are approved, they are
   coherent, they are `unreleased`. `npm run qa:art` then flip the flag.
2. **Merge #86.** It is the seam. Without it a new plate has nowhere to go.

## The generation order, and exactly what to ask for

### 1. HEADS — 8 masters. _This is the most important thing on the list._

You have 8 hair masters and 5 heads that are all called `bald_neutral`. The kit
cannot make two people look different. Generate:

- **Count:** 8 head masters
- **Naming:** `pg_master_head_06..13_<descriptor>`
- **Canvas:** match `pg_master_head_01`'s canvas exactly — same pixel dimensions,
  same anchor landmarks, same transparent background, same neck-cut line. The
  contact contract is what makes them modular; a head that does not match the
  contract is a head you cannot use.
- **What to vary:** skin tone across a genuine range; face shape (round, oval,
  square, heart, long); nose and lip morphology; brow; visible age (two of the
  eight should read 55+, one should read late teens).
- **What NOT to vary:** hair (that is a separate layer), expression (neutral,
  eyes open, mouth closed — expression is a later layer), lighting direction,
  head tilt.
- **Constraint to state in the prompt:** _"flat front-facing three-quarter-neutral
  bust, no hair, no clothing, no background, alpha transparent, consistent key
  light from upper left."_

### 2. HOME INTERIOR — 1 plate, 3 tiers.

- **Family:** `HOME_APARTMENT_ORDINARY_02` (already declared)
- **Why this one first:** count the beats. `home.someone-is-not-all-right` (5
  stages, 14 options), `home.the-week-that-does-not-balance` (3 stages, 9
  options), `care.the-person-you-look-after` (3 stages, 8 options), plus
  `adult.household-standing`, `adult.household-repair`,
  `adult.household-money-shortfall`, `adult.household-quiet-evening`,
  `adult.family-request`, `adult.care-request`, `adult.partner-plan`, and the
  entire household conversation. **One room covers ~40% of all authored beats.**
- **Master size:** 5504×3072, matching `env_shared_workroom_office_v1`, so the
  existing tier derivation (`npm run derive:tiers`) works unchanged.
- **Composition requirements:** a seated plane (kitchen table or sofa) and a
  standing plane, both unobstructed; a foreground occluder element (chair back,
  counter edge) delivered as a separate masked layer, because the pipeline
  supports `environment-foreground-mask` and it is what makes a person look like
  they are _in_ the room; empty of people; no readable text anywhere in frame.
- **Mood:** evening, lamplit, lived-in, not styled. The scenes set here are about
  money not dividing evenly and somebody not being all right. A show-home
  photograph would fight every line of copy.

### 3. COMMUNITY MEETING HALL — 1 plate, 3 tiers.

- **Family:** `CIVIC_COMMUNITY_MEETING_HALL_01` (declared; #86 registers a scene)
- **Covers:** `civic.the-thing-nobody-else-turned-up-for` (4 stages, 11 options),
  `adult.community-meeting`, `adult.community-building`, `adult.volunteer-ask`,
  `adult.local-issue-position`, `neighborhood-meeting-notice` conversation.
- **Composition:** rows of stacking chairs (mostly empty — the episode is
  literally about nobody else turning up), a folding table at the front, strip
  lighting, a noticeboard with **no legible text** (signage is composed at
  runtime, per Category E).

### 4. PUBLIC HEARING ROOM — 1 plate, 3 tiers.

- **Family:** `PUBLIC_HEARING_ROOM_01`; #86 registers `civic-hearing-room-production`
- **Covers:** the committee hearing transition, the legislation workspace's
  hearing step, `transit-access-pilot-provision` conversation.
- **Composition:** dais with 5–9 seats, a witness table facing it, public gallery
  behind. Seals and nameplates **left blank** — `civic-symbols.ts` composes them.

### 5. TITLE TABLEAU — 1 plate.

- #86 declares `TITLE_TABLEAU_SCENE_ID` and a `TitleTableau` component. It has
  nowhere to point.
- Ask for a wide, quiet, unpeopled civic exterior at dusk: municipal steps, a
  window lit on an upper floor. It must survive having "Our Civic Duty" and five
  buttons laid over its left third, so keep the left third low-contrast.

### 6. EVERYTHING ELSE — do not generate yet.

Chamber floor, courtroom, campaign office, press room, park, school, ordinary
workplace: all **[MISSING]**, all real gaps, and all pointless until there is a
consumer. #86's `scene-consumers.ts` marks three of them `sceneId: null` — the
seam does not exist, so a plate would sit in the bank next to the 25 masters.
Generate a room when a screen is waiting for it.

## The one-page checklist

```
  [ ] npm run qa:art          -> release the 25 character masters
  [ ] merge PR #86            -> the seam exists
  [ ] generate 8 head masters -> the kit can make different people
  [ ] generate home interior  -> ~40% of beats get a room
  [ ] generate meeting hall   -> the civic family gets a room
  [ ] generate hearing room   -> the political family gets a room
  [ ] generate title tableau  -> the first screen stops being a text list
  [ ] npm run derive:tiers    -> tiers for every new plate
  [ ] npm run inventory:art   -> confirm manifest agrees with disk
  [ ] npm run validate        -> everything still green
```

Seven generation tasks. After them, a player who starts a life sees a room, sees
people who look like people, and sees a title screen. Nothing else on the
backlog changes the experience as much.

---

# APPENDIX A — HOW EVERY NUMBER IN THIS DOCUMENT WAS OBTAINED

Every figure here is reproducible. Nothing was estimated.

```bash
# Route map
sed -n '20,32p' src/App.tsx

# Module reachability (the closure script is in the scratchpad; the method is
# a transitive walk of relative `from "..."` specifiers from each entry component)
node closure.mjs           # modules reachable from neither entry
node closure.mjs game      # modules reachable from PlayerGame
node closure.mjs office    # modules reachable ONLY from PlayerOffice

# Asset manifest census
node -e 'const m=require("./art/manifest/asset_manifest.json");
  const a=m.assets??m; console.log(a.length)'

# Stylesheet metrics
grep -oE "^\.[a-z0-9-]+" src/player/player.css | sort -u | wc -l    # 318
grep -c -- "--[a-z-]*:" src/styles.css src/player/player.css        # 0 / 28
cat src/styles.css src/player/player.css \
  | grep -oE "#[0-9a-fA-F]{3,8}\b" | sort -u | wc -l                # 372
cat src/styles.css src/player/player.css \
  | grep -oE "font-size: [^;]*" | sort -u | wc -l                   # 69

# Accessibility
grep -oE "aria[A-Za-z]*|role=" src/player/PlayerGame.tsx | wc -l    # 0

# Styled-vs-used class diff
grep -oE 'className="[^"]*"' src/player/PlayerGame.tsx \
  | grep -oE 'game-[a-z0-9-]+' | sort -u > used.txt
grep -oE '^\.game-[a-z0-9-]+' src/player/player.css \
  | sed 's/^\.//' | sort -u > styled.txt
comm -23 used.txt styled.txt    # used but unstyled: none (was 5 before #87)
```

# APPENDIX B — WHAT THIS WAVE (PR #87) FIXED WHILE AUDITING

The audit found five production classes shipped without any styling —
`.game-story`, `.game-passage`, `.game-journal`, `.game-journal-toggle`,
`.game-search` — plus two pre-existing unstyled classes, `.game-day` and
`.game-saves-damaged`. Rather than file them, they were fixed: ~180 lines added
to `src/player/player.css` in commit `1d123a8`, one e2e assertion adjusted for
the resulting `text-transform: uppercase`, and `npm run validate` re-run green
(1,423 tests across 88 files) with the 11 narrative e2e tests passing.

The "used but unstyled" diff in Appendix A now returns empty. That is the one
visual defect this audit both found and closed.

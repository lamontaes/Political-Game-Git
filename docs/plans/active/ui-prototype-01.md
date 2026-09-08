# UI-PROTOTYPE-01 — clickable whole-game shell and menu visual prototype

**Status:** development-only visual prototype. NOT production UI, NOT gameplay
authority, NOT a simulation change.

Owner approved the CORE-FIRST click-through scope on 2026-09-08. The prior HOLD
is removed. This note is the Phase 0 architecture record the packet asks for.

## What this is

A standalone, development-only clickable prototype of the title screen and the
core in-game shell, so the owner can spend real time clicking around and judge
the visual hierarchy and information architecture in context, on actual released
game art, before production UI convergence begins.

It is a decision accelerator. It is not the production route and does not
replace human visual acceptance of the real game.

## Containment

The prototype is a second Vite HTML entry that the normal application never
references and never imports.

Files this prototype owns:

- `ui-prototype.html` — repository-root dev entry.
- `src/ui-prototype/**` — all prototype React, state, data, tokens and CSS.
- `tests/e2e/ui-prototype.spec.ts` — prototype-only browser proofs.
- `docs/plans/active/ui-prototype-01.md` — this note.
- `docs/plans/active/ui-prototype-01-screens/**` — owner-review captures.

One file outside that set changed, and it is declared here rather than buried:

- `scripts/prose-corpus/coverage.ts` — **one data entry** added to
  `SCAN_EXCLUSIONS`, naming `src/ui-prototype` with its reason.

  Why it was unavoidable: the prose-corpus coverage test asserts a live literal
  count over `src`, so **any** new directory under `src` fails it. Confirmed by
  measurement — with `src/ui-prototype` moved aside the test passes, and with it
  present the count moves from 49,311 to 50,532. `SCAN_EXCLUSIONS` is that
  tool's own designed mechanism for declaring "this is not authored player
  prose", and `src/devtools` is the existing precedent. The entry adds no logic,
  changes no classification, and restores the test's numbers exactly, so PR
  #125's own expectations are untouched. The alternatives were worse: moving the
  prototype out of `src` would drop it out of `tsc -b` coverage, and editing the
  expected constants would rewrite that lane's assertion rather than declare a
  fact about this directory.

Nothing else changes. In particular the following were confirmed untouched:

- `src/App.tsx`, `src/main.tsx`, `index.html`
- `src/player/PlayerGame.tsx`, `src/player/PlayerOffice.tsx`, `src/player/player.css`
- every other `src/player/*` component
- `src/simulation/**`, save/history/World schemas
- campaign / election / governing semantics
- `art/manifest/**` and every production art manifest
- `package.json`, `vite.config.ts`, `playwright.config.ts`, `tsconfig*.json`
- PR #79-owned player-route files
- PR #125 prose tooling, apart from the single declared `SCAN_EXCLUSIONS` entry
  above — no prose logic, corpus record, adapter or expected count changed

### Why no build/config change was required

`vite dev` serves any HTML file at the project root, so `/ui-prototype.html`
resolves while `npm run dev` is running with no plugin, alias, or script edit.
`vite build` takes `index.html` as its default and only Rollup input, so the
prototype is **not** emitted into `dist/` and cannot reach a production bundle.
The Playwright `webServer` already runs the same dev server, so the prototype
proofs need no separate harness.

The containment is therefore structural, not a promise: the production entry has
no import path into `src/ui-prototype/`, and the production build has no input
that reaches it.

### Direction of dependency

The prototype imports a small number of **read-only presentation selectors** from
production modules — the scene registry and the released runtime visual library —
so that it paints real released art with real authored scene geometry instead of
inventing either. Production modules import nothing from `src/ui-prototype/`.
That direction is the rule; a reverse import would be a containment failure.

## Art consumed

No image was generated. Every raster is an already-released production asset,
resolved at runtime through `PRODUCTION_VISUAL_LIBRARY`, which admits an asset
only when its generation, QA and runtime-release status are all approved.

| Surface                          | Scene id                                  | Asset id                                                   |
| -------------------------------- | ----------------------------------------- | ---------------------------------------------------------- |
| Title / Home                     | `civic-community-meeting-title`           | `title_bg_civic_community_meeting_hero_slot_5504x3072_v1`  |
| Scene shell — Legislative Office | `shared-workroom-office-production`       | `env_shared_workroom_office_v1`                            |
| Scene shell — Home               | `residence-apartment-living-canonical-03` | `env_residence_apartment_living_canonical_03_5504x3072_v1` |
| Scene shell — Community Room     | `civic-hearing-room-production`           | `env_civic_hearing_room_5504x3072_v1`                      |

Nothing is upscaled, promoted, re-manifested, or re-lineaged. No menu, wordmark,
headline, seal or button is baked into a raster; all of it is DOM/CSS/SVG.

Prototype people are placed on the **authored anchors of those scenes** — real
`x_percent` and `floor_contact.floor_y_percent` values read from the scene
registry — rather than on coordinates guessed by eye. Because released modular
character art is not in scope for this prototype, a person is drawn as an honest
labelled hitbox marker at its anchor, not as a fake portrait.

## Pre-ship art correction gate — U03-02

**Status: OPEN. Not R1 work. No image was generated, altered, or re-flagged.**

| Field                   | Value                                                                         |
| ----------------------- | ----------------------------------------------------------------------------- |
| Source plate            | `title_bg_civic_community_meeting_hero_slot_5504x3072_v1`                     |
| Scene                   | `civic-community-meeting-title`                                               |
| Subject                 | The seated audience figure in the grey polo, near the lectern                 |
| Raised by               | Owner click-through, PLAYTEST-03, 2026-09-08                                  |
| Verdict                 | The face reads as too realistic for the game's illustrated style              |
| Required before release | The owner must see the corrected face **at actual title scale** and accept it |

This is a style correction against that one figure in that one title plate. It
is **not** evidence of a defective modular PEOPLE1 character — the figure is
painted into the background, not assembled from the character system — and it is
**not** a rejection of the composition, which the owner approved.

Handling when the gate is worked:

- prefer a focused correction to the face over regenerating the plate;
- preserve the existing composition, file identity and lineage;
- regenerate only if a focused correction cannot hold the style;
- do not promote, re-manifest, or re-lineage anything to carry the fix.

This gate does not block menu or shell engineering, and R1 deliberately did not
touch it: R1 generated no art and changed no release flag.

## Prototype state

Session-local only. One reducer in `src/ui-prototype/state.ts` holds:
current surface, a browser-like history stack of entity/workspace views, the
selected entity, the open anchored action menu, quick/full dossier state, pins
with order and per-pin size, the People default-view preference, and the
prototype notice. There is no second World, save format, calendar engine,
legislation engine or relationship system, no `localStorage`, and no production
save write. Reading a menu never advances prototype time.

## Content

Prototype content is authored in `src/ui-prototype/data.ts`, every record is
flagged `prototypeOnly`, and the shell says so on screen. Where the repository
already had useful bounded demo labels they are reused — "Transit Access Pilot",
"Constituent intake briefing", "Community transit meeting", "East End Community
Room", "Legislative Office" all come from the existing Run D-Lite demo agenda.
Person names are prototype placeholders and are not exported anywhere.

Relationships between records are explicit IDs. Nothing parses a display name to
find a person, and no screen shows a numeric relationship score.

## Scope

Implemented for the first owner click-through (the approved CORE-FIRST set):

A Title/Home · B Normal scene shell · C compact bottom-left primary navigation ·
D People directory **without** the Relationship Web · E direct person interaction ·
F quick dossier → full dossier → Back · G mixed pin rail · H Calendar ·
I Personal/Finances · L Offices/Work/Civic context · M Life History/Journal ·
and only the Options behavior those surfaces actually consume.

Deferred from this first review, by owner instruction: the Relationship Web,
Search, expanded News/Newspaper, broad contextual help, and expanded notice
hierarchy. Their candidate specifications remain in the packet as future
reference; nothing here was widened to reach them.

## Product grammar held

Scene first / dossier second / database third. No permanent left sidebar, no top
ribbon, no stacked panel pile-up, no universal relationship meter, no stat
dashboard as a default screen, no WASD, no mandatory briefing, no background
ticking clock, no End Day turn, no fake success percentages, no political-capital
meter, and no new simulation mechanic invented to populate a menu.

## How to open it

```
npm install
npm run dev
```

Then open **http://localhost:5173/ui-prototype.html**. The ordinary game stays at
`http://localhost:5173/`, unchanged.

The browser proofs are `tests/e2e/ui-prototype.spec.ts`. The review captures are
regenerated with `UI_PROTOTYPE_SCREENS=1 npx playwright test
tests/e2e/ui-prototype-review-screens.spec.ts`.

## Stop conditions

None were hit. Containment was achieved without touching a production player
file, without routing normal play through a fixture, without promoting an art
candidate, and without a new World/save/history/time system. Every required Drive
authority was read through the authorized connector.

## R1 — owner-feedback corrections (PLAYTEST-03)

The owner approved the **direction** after the first click-through — not the
final design, and not merge. R1 is the finite correction pass that followed. It
stayed inside `src/ui-prototype/**`, its own e2e specs and this documentation.

| Item                              | Status                      | What changed                                                                                                                                                                                                                                                                                                                                                 |
| --------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| U03-01 title composition          | Implemented                 | The wordmark, rule and menu scale and move together: the whole grouping is smaller and sits in the upper left, clear of the lectern staging. The selected cue is a short brass line beside the word instead of a long detached rule. The slogan and the asset caption are gone from the composition; the asset identity moved to the developer inspector.    |
| U03-02 title audience face        | Pre-ship gate recorded      | See the gate above. No generation, no flag change.                                                                                                                                                                                                                                                                                                           |
| U03-03 bottom-left proximity      | Implemented                 | The cluster rests small and translucent, and rises — larger, opaque, on a solid surface — on pointer approach within a forgiving radius, on keyboard focus, or when opened. The button's box never changes size, so the click target is stable and nothing reflows. Reduced motion holds the cluster at full size and carries the change with opacity alone. |
| U03-04 pin direct manipulation    | Implemented                 | Drag-to-reorder across mixed pin kinds, with a movement threshold so an ordinary click still opens the record, Escape cancelling a drag without disturbing the order, Move up/down retained as the keyboard route with their menu deliberately left open, and size selection restored to dismissing its own menu.                                            |
| U03-05 dossier hierarchy and copy | Implemented                 | Current activity is a separate, marked "Right now" line beside the identity rather than an unexplained trait. "What you know" became **Details**; Last interaction stayed. Ordinary known facts carry no badge, while public record, second-hand report and outright gaps say so in words. "What needs you" became "Waiting on you".                         |
| U03-06 who am I / Personal        | Minimum clarity implemented | Personal states the name and the age plainly at the top, says it is a fixed prototype character, and the shell's cluster carries the player's name as the quiet identity route. The broader Personal redesign is deferred, as the owner reserved it.                                                                                                         |
| U03-07 preview disclosure         | Implemented                 | A first-entry card names the honest boundaries — New Game does not create a character, Talk is off, the clock does not run, pins last as long as the tab. What remains afterwards is a small corner mark with the inspector behind it, replacing the wide banner.                                                                                            |
| U03-08 patch notes and version    | Implemented (display only)  | A Patch notes destination and a quiet bottom-right version display, both read at build time from this checkout's `package.json` and `PATCH_NOTES.md`. No version literal exists in the prototype. Sections the file marks UNRELEASED are labelled **Not released**. VERSION-AUTO1 keeps release automation.                                                  |

One defect found during the pass and fixed: Escape did not close a title-level
overlay opened from inside the shell. It does now, wherever the overlay came
from.

### R1-CI-PIN-CLOSE — the rail's lane

Exact-head CI at `bc258e7` failed the new drag proof: after the drag, clicking
**Close Journal** timed out because `div.p-pin-slot` inside `aside.p-pin-rail`
intercepted the pointer. The control was genuinely covered — this was a layout
defect, not a flaky test.

**Cause.** The rail's width was whatever its widest pin happened to be, while
the workspace scrim reserved a fixed `19rem` guess on its right. An expanded pin
carrying a long title — "Ordinance 41 — Transit Access Pilot" — rendered wider
than the guess on the CI font stack, so the rail's slot extended left over the
workspace's own header and sat on its Back and close controls. Two numbers
describing one lane, free to disagree.

**Fix.** One token owns the lane. `--p-rail-lane` (with `--p-rail-inset`) sets
the rail's own width and is the value the scrim's right padding is computed
from, at every width, with narrower screens redefining the token rather than
restating a padding. A pin can no longer widen the rail: it ellipsises inside
it, and `overflow-x: hidden` stops the rail from growing a scrollbar of its own.

**Not done:** no force-click, no timeout increase, no skip, no deleted test. The
original real click is retained exactly as written.

**Proof added.** The lane geometry is now asserted at 1920x1080, 1600x900,
1366x768, 1280x720 and 1024x768 with the rail populated and its widest pin
expanded: the rail's left edge is right of the workspace's right edge, no slot
exceeds the lane, `elementFromPoint` at the close button's centre resolves to
the close button, and the button is then actually clicked. A further test walks
open, link, Back, close, drag, size and reorder with the rail populated, by
pointer and by keyboard, and checks the resting proximity state survives.

One more defect surfaced while proving the keyboard path: the cluster stayed
raised forever after its first use, because choosing a destination unmounts the
focused menu item and a removed element never fires blur. Focus is now read from
the live subtree instead of tracked through events.

### Reusable production integration points

These are the parts of R1 that production UI convergence can take, rather than
re-derive:

- **`useProximity(ref, radius)`** in `src/ui-prototype/SceneShell.tsx` — the
  approach-radius hook, pure DOM, no prototype state. The accompanying
  fixed-box / scaled-inner CSS pattern is what keeps the hit target stable.
- **The pin gesture model** — pointer threshold, `reorder-pin` by key rather
  than by index, click suppression after a drag, capture-phase Escape cancel.
  The reducer case is state-shape independent.
- **`FactList` and `attributionFor`** in `src/ui-prototype/parts.tsx` — the
  no-badge-for-plain-knowledge attribution rule, which maps directly onto a real
  epistemic model.
- **`src/ui-prototype/version.ts`** — reading version and notes from the
  checkout with no literal, so a display cannot drift from its source.
- **The overlay/Escape layering order** in `src/ui-prototype/state.ts` — the
  ordering that makes Escape close exactly one layer.

### Remaining handoffs

- **U03-02** — the title face correction, gated above, owned by visual review.
- **U03-06** — the full Personal layout, deferred by the owner.
- **Production convergence** — the real creator, life and conversation routes,
  persistent pins and correct entity targeting.
- **FLOW-PLACE1** — real travel and presence. The prototype's room changes are
  `roomId` changes and nothing more.
- **PEOPLE1** — complete deterministic people. Scene figures here stay markers.
- **VERSION-AUTO1** — release automation, scripts and workflows, untouched here.

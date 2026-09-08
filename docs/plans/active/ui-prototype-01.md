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

# Graphics & Menu Readiness Map — Our Civic Duty

Status: overnight audit (2026-09-05), from read-only inspection of `src/player/*`, `src/ui/*`, `src/presentation/visual-integration.ts`, `scene-registry.ts`, `life-scene.ts`, and the accepted visual authorities (`player-presentation.md`, `scene-and-person-presentation.md`). **Scope: accepted `main` (54ec313).** #91 ("Post-#87 player presentation") is the branch actively reworking exactly this surface and is read-only for this run — treat everything here as the pre-#91 baseline and re-verify against #91's head before starting overlapping work (see action board).

> Do not invent a new art direction. Use the existing visual authorities. Missing art must fail closed.

---

## The one headline: there are TWO scene-first products, and only the dev one is polished

|                          | **Shipped surface** (`PlayerGame`, the default)                                                                                   | **Stage-6.5 grammar** (`PlayerOffice`, `?view=office-fixture`)                                                                                                                                                         |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| How you reach it         | the actual game (title → New Game → play)                                                                                         | a **dev route** only (`App.tsx:37`)                                                                                                                                                                                    |
| Layout                   | centered ~46rem document column: header portrait, a home backdrop panel, text `StoryView`, an "Elsewhere in this life" button row | the full grammar: bottom-left nav/time (`PermanentShell`), left temporary dossier (`QuickDossier`), center scene with **placed sitters** (`OfficeScene`), right persistent people rail (`PinRail`), civic-glass panels |
| People shown as figures? | **No** — NPCs are prose only ("X and Y are here.")                                                                                | Yes — but fed by a **frozen 2-person Run-B/D fixture**, not world occupancy                                                                                                                                            |
| Menu exits               | **no Escape, no click-out, no X** — toggle-to-close only                                                                          | full Escape ladder + click-out + explicit closes                                                                                                                                                                       |
| Scene backdrop           | **home-or-nothing**, painted under every beat                                                                                     | office fixture room                                                                                                                                                                                                    |

**Implication for tomorrow:** the impressive scene-first experience the brief describes is REAL but lives entirely in the dev fixture. Bringing it to the shipped game is the core graphics/menu work, and it is mostly _integration_, not new art direction. Judge readiness **per surface, not per repo.**

---

## People rendering — how it actually works, and the five "people not shown" causes

There is exactly **one** people→scene binder, `composeOfficeVisuals` (`visual-integration.ts`), and it is **fail-closed and identity-safe**: `resolvePersonVisualRecipe` returns `null` unless appearance-seed AND pose-family match, so a generated stranger **never** inherits an authored face. Good. But it is wired only into `OfficeScene` (office-fixture) and the character-proof dev view.

The five distinguishable causes of "people not shown" (all present, per the audit):

1. **By design in the shipped game** — `PlayerGame` never invokes `ModularCharacter`/`composeOfficeVisuals`; NPCs are text-only. _This is the dominant real cause._
2. **Absent from the fixture tuple** — the office scene population is a hardcoded 2-person `createRunBFixture`, not arbitrary world occupancy.
3. **No matching recipe + empty modular plan** → `isPlaceholder`, body-less (a labelled hitbox with no figure).
4. **`PRODUCTION_CHARACTER_LIBRARY` is empty** ("until component art is released") — so **every non-authored person resolves to 0 modular layers**; only 2 dev-fixture seeds (candidateA01/B01) have art. This is the hard gate.
5. **Missing released art** — `createRuntimeVisualLibrary` admits only generation+qa=approved && release=released, so an unreleased raster is dropped → page fallback.

**Do NOT claim "people generation is broken."** Generation is fine and deterministic; the gaps are (a) the shipped game doesn't draw people at all, and (b) production body art isn't released yet.

Two concrete defects worth a ticket:

- `isPlaceholder` is computed on every `ComposedCharacterVisual` but **no UI reads it** — nothing surfaces "this person has no art"; a readiness pass must recompute `asset==null && modular==null`.
- `useRasterTier.ts:92` swallows `image.onerror` — a scene whose tier URL is **broken** renders blank _silently_, indistinguishable from "no art registered" (`data-has-plate=false`). Add a decode-failure signal.

---

## Canon↔realization: the concrete "school event over a home scene" leak

`resolveLifeScene` (`life-scene.ts`) only ever returns a **domestic** room or `null`, and `StoryView` paints that backdrop **unconditionally**, regardless of the beat's canonical location. So a formative school-corridor beat or an adult office beat is drawn over the **home apartment**. The prose is truthful; the _backdrop_ is not bound to the beat's location. Fix by binding the backdrop to the beat's location/family (school→school room, office→office), and fail closed (paint nothing) when no released room matches — rather than defaulting to home.

(Fail-closed art is otherwise a genuine strength: unknown scene → no plate → typographic fallback; missing likeness → initials.)

---

## Menus / overlays — exits

- **Shipped `PlayerGame`: materially weak.** No Escape handler, no click-outside dismissal anywhere in `PlayingScreen`; "Elsewhere" surfaces close only by re-pressing the same toggle; no overlay has an X. The journal has a Close button; the bill has "Close the bill".
- **Office-fixture: good.** Full Escape ladder (`PlayerOffice.tsx:164-188`) + click-out (190-214); `QuickDossier`/`CivicLearning`/`ConversationStrip`/workspaces all have explicit closes. Two office menus lack an explicit Cancel/X and rely on Escape/click-out: `PersonActionMenu` (`OfficeScene.tsx:104`) and `PinControlMenu` (`PinRail.tsx:69`) — weaker for a touch user.
- **Dev affordance in nav:** `PermanentShell.tsx:108` puts a "Developer view" anchor inside the otherwise player-facing office nav — remove/relocate before promoting that grammar.

Grammar to preserve (Stage 6.5): bottom-left = navigation/time · left = temporary inspection/dossier · center = current scene/workspace · right = persistent pins/people. Menus need explicit exits (X where appropriate, Escape, click-out). Search/information must remain a first-person epistemic view, never God Mode (the `Your Read` dossier already tags every field with an epistemic-access class).

---

## "Plain white browser sheet" offenders (worst first)

1. **`LegislationWorkspace`** (`player.css:4038`) — flat `#efeee8` sheet, system-ui sans-serif, `max-width:900px` centered; diverges from both the pale story surface and the dark civic-glass office grammar. Most sheet-like.
2. **Default game secondary surfaces** — `OrdinaryDayView`, `PlayerConversations`, the office section render as **borderless flow siblings** with only a top margin/border, sitting either over the fixed room image (no panel of their own) or on the pale `#e8ece8` body. Only `StoryView` gets the translucent `.scene-backdrop-content` panel.
3. **Journal** — modest `#fdfdfb` card; least offensive.

---

## Asset / dependency readiness map for tomorrow

**Can proceed now (integration; no new art, no PR collision if #91 lands the shell):**

- Bind the scene backdrop to the beat's location (kill the home-over-everything leak) — but this is squarely in #91's territory; coordinate.
- Add Escape / click-out / X to the shipped `PlayerGame` overlays.
- Re-theme the plain sheets (LegislationWorkspace + default secondary surfaces) to the accepted grammar.
- Surface `isPlaceholder` and a raster decode-failure signal (small, safe, additive).

**Requires existing proof / fixture (no new art):**

- Wire `composeOfficeVisuals` into the shipped game for the _authored_ seeds to prove the placement path end-to-end.

**Blocked on new art release (the real gate):**

- Drawing real generated NPC bodies anywhere: `PRODUCTION_CHARACTER_LIBRARY` is empty; a **seated real body**, complexion-matched body bases, masculine hair, eyewear, and the wider wardrobe are separately gated (`ROADMAP ~469`). The **compositor contract already exists** (D-053/54/55/57) — this is an art-production task, not an engineering one.
- The distinct visual Create Character screen (skin/face/hair/body) depends on this same art release.

**Blocked on human visual/play acceptance (cannot be signed off by CI):**

- Whether the shipped scene-first surface "feels like a game" — the #91 human play already said "core scene-shell pass / directional win, semantic/UX repair required." That repair is the owner's call.

**Blocked on other PRs:**

- Any presentation-shell change overlaps **#91**; the campaign/legislation UI overlaps **#85/#79**. Sequence after those settle.

---

## Method note

This is a static read of `main`. It does **not** substitute for human visual/play acceptance, which remains a separate gate (green CI ≠ product acceptance). Re-fetch #91 before acting on any shipped-surface item, because #91 is actively rewriting `PlayerGame`/presentation and may already close several of the "shipped surface" gaps above.

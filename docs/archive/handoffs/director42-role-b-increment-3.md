# DIRECTOR42 ROLE B — increment 3: a place is named from the catalog

Status: **READY FOR RECEIVING REVIEW — VALIDATION PENDING.**

## Source identity

|                          |                                                                              |
| ------------------------ | ---------------------------------------------------------------------------- |
| Role / session           | ROLE B — DEHARDWIRE, `session_01WZB6HoCjRiQHuG7TA46wKV`                      |
| Program / model / effort | Claude Code, Opus 5, xhigh, implementation                                   |
| Branch                   | `claude/director42-role-b-dehardwire-c3bgvv`                                 |
| Base of this increment   | `61a16ebca0b280d6fbeba4b763f627d802907048` (increment 2, RECEIVED by LAND)   |
| **New head**             | `fbfe7663491b3d12efc98b5f9e55a3de567962e1`                                   |
| Underlying composition   | #255 `5ed9bbd01a4b52bd8e365b4c5831cf990f232571` — **unchanged, not rebased** |

LAND's SHAs were verified against the remote rather than taken on trust:
`origin/main` is `ea33c76e6e67198937d48b8ff164e1bbba7dd345` with parents
`27fac090` and `8e552fe8`; #256's head `8e552fe8` is an ancestor of main; and
#255 `5ed9bbd0` is now in main too. **No source or ownership fact conflicts.**

Per LAND's instruction this run was not restarted, not rebased, and no shared
or generated prose artifact was touched. LAND owns composition onto `ea33c76e`.

## One ownership correction

LAND's update calls the in-flight run "residual-3". It is **residual 4**, the
fixture classification. **Residual 3 — the authored sitting's Kentucky cast and
place — is untouched and still open.** Flagging it because LAND asked to hear
when residual scope changes, and it did: classifying the fixture modules turned
up a production hardcode that was in no residual list, and this increment fixes
it rather than only classifying it.

## What the classification found

The census searches for measure designations. This was a place, so it walked
straight past it.

`src/presentation/run-a-projection.ts` rendered **every birthplace and every
residence on the player's Quick Dossier** through `runAPlaceDisplayName` — the
Run-A development fixture's helper:

```ts
canonicalName === "Lexington-Fayette, Kentucky"
  ? "Lexington, Kentucky"
  : canonicalName;
```

One place recognized by literal. A character from Lexington read correctly; a
character from anywhere else was shown whatever filing name the jurisdiction
record carried. It reaches five player surfaces: `QuickDossier`,
`PlayerOffice`, `OfficeScene`, `PinRail`, `MeasureFloorSurface`.

That is the hard rule's fourth clause exactly — a production literal existing
to make one Lexington fixture look complete.

**Fixed by binding to the place catalog**, which already holds the answer:
`lifePlaceByJurisdictionId(id)?.displayName ?? jurisdiction.name`. Every
playable place — the four named ones and every row of the national corpus —
carries its resident-facing `displayName` beside its formal filing name. A
jurisdiction the catalog does not list keeps its own recorded name; an unlisted
place is not an unknown one.

## The pinned set shrank, and the pin caught it

Removing that call took `run-a-fixture.ts` **off the ordinary-play runtime
graph entirely**. The pinned-set test failed on the shrink, which is the
intended behavior: the equality is deliberate in both directions, because a
fixture quietly dropping off is a fact about the game worth recording rather
than absorbing. Six modules, now five.

## The remaining five, classified individually

Group-pinning replaced with per-module findings in
`docs/dehardwire/classification.json`:

| Module                            | Finding                                                                                                                                                                                                                                                                                                                                   |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `committee-room-fixture.ts`       | A registered room — scene geometry, names no measure, person or outcome. Renderer scope is ROLE D's.                                                                                                                                                                                                                                      |
| `office-council-staff-fixture.ts` | A registered room, as above.                                                                                                                                                                                                                                                                                                              |
| `demo-jurisdiction-context.ts`    | `DEMO_START_DATE` is the game's calendar epoch — every state and corpus place opens on it, so a scenario default, not one world's instance. `LEXINGTON_DEMO_CONTEXT` is the Lexington scenario's own context, used as that place's context. The module's _name_ reads like a fixture leak; its contents are not one.                      |
| `demo.ts`                         | Needed a real answer. **`createDemoWorld` does default its jurisdiction to Lexington** — which would make Kentucky the universal normal start rather than one explicit scenario. Ordinary New Game never calls it: its only runtime callers are the Run-A fixture and three `src/ui` developer proof routes. Now pinned **behaviorally**. |
| `portability-fixture.ts`          | No play-path consumer; on the graph only because the barrel re-exports it. Dev/test-only.                                                                                                                                                                                                                                                 |

## Proof

`src/presentation/dehardwire-place-binding.test.ts` (new, 3 tests):

- named **non-Kentucky** ordinary starts (Nebraska, Alaska) — neither the
  jurisdiction nor the clock falls back to Lexington;
- every playable place resolves to its own resident-facing name through the
  catalog, Lexington included — now because the catalog says so rather than
  because a development run spelled it out;
- a character's own place renders on the dossier as the catalog names it, never
  a filing name, and "Not known" stays "Not known" when no place fact exists.

## Checks actually run

| Check                                                           | Result                                                                                |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `npm run typecheck`                                             | pass                                                                                  |
| `npm run lint`                                                  | pass                                                                                  |
| `npm run format`                                                | pass                                                                                  |
| `vitest run src/presentation src/content src/simulation src/ui` | **260 files, 3286 tests pass**, 6 files / 19 skipped                                  |
| `dehardwire-place-binding.test.ts` (new)                        | 3 pass                                                                                |
| `dehardwire-census.test.ts`                                     | 5 pass                                                                                |
| `node scripts/dehardwire-census.mjs`                            | exit 0 — 13 cases, 13 data/label, **0 hardcode, 0 unclassified**, 457 runtime modules |

**NOT RUN by this owner:** the repository gate as the project runs it, the
Playwright lane, `test:run-a/b/c`. Per LAND, the already-classified pr79
failure was not re-run.

## Residuals

1. **Residual 3 — the authored sitting's cast and place are still Kentucky's.**
   Open, untouched, B-owned. Widening it means a second authored sitting, not a
   deletion; emitted text to coordinate with ROLE C.
2. Pre-existing unit and browser failures from increments 1–2, present at their
   respective bases. _Owner: LAND to assign._
3. `demo-jurisdiction-context.ts` and `demo.ts` carry fixture-sounding names for
   contents that are not fixtures. Renaming touches shared surfaces for
   cosmetics, so it is left alone and recorded. _Owner: LAND, if ever worth it._

No people, art or renderer scope. No `.tsx` player surface edited in any
increment.

## Receiver action

**LAND: take `fbfe7663` as the successor-only delta; compose onto `ea33c76e`.**

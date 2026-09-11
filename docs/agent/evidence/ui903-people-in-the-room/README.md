# UI9-03: the automatic roster removed, selection moved into the room

Development-time browser evidence, not a run of the project's own harness. The
repository's `@playwright/test` resolves a Chromium build this container does
not have and cannot download, so the probe named `/opt/pw-browsers/chromium`
(**Chromium 141.0.7390.37**) explicitly. That is a local review run. It is not
`npm run test:e2e` and must not be reported as one; the specs updated alongside
this change are what hosted CI actually executes.

Seed `ui903-rail`, Kentucky, age 34, `shares-a-home`, ordinary production art,
1440×900.

## What was asked, and what the run saw

| Claim                                        | Reading                                                           |
| -------------------------------------------- | ----------------------------------------------------------------- |
| No automatic people sidebar in ordinary play | `people-rail` 0, `rail-person-*` 0                                |
| The person in the room is a real control     | `BUTTON`, name "Sabrina Gray, who you live with"                  |
| Reachable by keyboard                        | focus ring, Enter opens the menu, `aria-expanded` true            |
| Reachable by pointer                         | click opens the same menu (see the defect below)                  |
| Quick dossier, full record, Back             | `quick-dossier` 1 → `person-workspace` 1 → "← Back" closes it     |
| One rail, mixed, player-filled only          | `pin-person:…` + `pin-government:us-ak-anchorage`, one `pin-rail` |
| Pins are not silently re-populated           | rail absent until the player pins; 0 rows before                  |
| People navigation still discoverable         | `elsewhere-people` opens; 4 `people-pin-*` controls               |
| Pins persist across save and reload          | identical rail contents before and after reopening the save       |

Screenshots: `b-selected.png`, `c-quick-dossier.png`, `c-full-record.png`,
`d-mixed-rail.png`, `e-people.png`, `f-reloaded.png`.

## The defect this run found

Pointer activation was dead while the keyboard route was perfect.

`.scene-backdrop-people` is a fixed, full-viewport layer and was
`pointer-events: none` — correct and necessary while the figures were
decoration, because otherwise a sheet of people swallows every click meant for
the room and for the panel floating over it. The moment a token became a
button, that rule made the mouse fall through it to `.scene-backdrop-stage`;
Playwright reported the stage intercepting the click. Focus, the ring and Enter
all worked, so a keyboard-only check said the surface was fine.

The fix takes the pointer back on `.scene-person-token--selectable` alone. The
space between people stays click-through.

This is the case `AGENTS.md` names: "semantic visible controls require actual
pointer and keyboard activation tests." The existing spec called
`pointer and keyboard reach the same person` pressed only Enter. It now does
both, and `scene-first-shell.spec.ts` does both as well.

## Two readings that were my instrument, not the product

Recorded because reporting either as a defect would have been wrong.

- `pin rail present: 0` — `ShellPinRail` returns `null` with no pins, and the
  probe measured before anything was pinned. An empty rail rendering nothing is
  the intended behaviour.
- `Back present: 0` — the control reads "← Back"; a `/^back/i` matcher cannot
  see it. The testid is `<workspace>-back`.

A third reading was real but seed-shaped rather than broken: this life's home
place carries no verified government link, so `municipal-pin` is offered only
once a government is being inspected. The probe selects one from the directory
and pins that, which is the route a player takes.

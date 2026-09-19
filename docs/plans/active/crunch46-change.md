# CRUNCH46 08 — CHANGE: a world that changes

Authority: CRUNCH46 sections 00–00B, 08 and 13 (Drive
`1u70OSFIy2uBgePzq8AqV_L2onGgeKjzvcodOFTiSre0`); ALIVE44 chunks 2 and 8.
Contract: [docs/systems/macro-economy.md](../../systems/macro-economy.md).

Branch `claude/change-world-that-changes`, base `fed321f7`.

## Interfaces agreed

- WORLD (-f1): persists `macro-starting-conditions` in
  `history.worldConditions`; reader `macroStartingConditions(world)`. CHANGE
  carries `World.macroEconomy` plus one `assertMacroEconomyIntegrity` call and
  adds `ensureMacroEconomyStarted` after WORLD's opening step.
- GOVERNING (-a6, `38a79d53`, PR #266): CHANGE carries the
  `economy:monthly-step` registry line; fiscal and capacity record types are
  pending from GOVERNING.
- CRISIS (-c2): typed disaster, public-health and conflict records, physical
  units only; CHANGE registers a reader.
- PRESS (-85): stories cite `economy.release-published` event ids; Civic
  Ledger publication stays.
- UI (-cf): owns the mount of `MacroConditionsPanel`.
- MAPS (-41), CAMPAIGN (-49): read the pure selectors.

## Increments

1. Done in source: section-13 kernel, store and integrity, monthly producer,
   W3 trade-disruption shock, releases and News, readers, Budget panel
   adapter, tests, 30-year performance check.
2. Done in source: stacked on WORLD `0abaf8ef`; the opening hook starts
   macro history from WORLD's persisted record; the kernel uses WORLD's
   engine-independent math; release declaration `change-world-economy`.
   Next: CRISIS disaster reader.
3. Then: GOVERNING fiscal/capacity consumers (revenue shortfall/windfall,
   service backlog/recovery); source-derived state sector exposure (needs a
   BEA state GDP-by-industry acquisition); campaign concern and governing
   brief adapters.

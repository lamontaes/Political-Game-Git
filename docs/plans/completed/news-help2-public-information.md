# NEWS-HELP2 public information consumer

Status: completed

## Authority and scope

- Game Constitution principles 3, 7, 13, 22, 23, 25, and 31.
- Shared delivery contract and section B in Drive document
  `1BQTTAZlOLQBVKQpzVGPfqEH8iD5kuH08aB8nIfibamc` (revision read
  2026-09-08).
- Existing history, evidence/discovery, legislative, scene-surface,
  player-presentation, prose, and browser persistence contracts.

This wave adds the smallest explicit publication consumer for facts already
recorded in a save. It does not add a press simulation, external headlines,
media ownership/bias/advertising, or a second event/history store.

## Reuse and ownership map

| Need                                 | Canonical owner reused                                                         | NEWS-HELP2 ownership                                                             |
| ------------------------------------ | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Occurrence truth and stable identity | `HistoricalEvent` and contiguous `HistoryStore`                                | Explicit publication/correction events plus strict writer/query conventions      |
| Legislative developments and votes   | `LegislativeActionRecord`, `LegislativeVoteRecord`, `LegislativeMeasureRecord` | Deterministic publication copy from linked completed records only                |
| Public/private boundary              | `HistoricalEvent.visibility`, existing disclosure ladder                       | Reject private, future, missing, and publication-of-publication sources          |
| Save/reload                          | World JSON plus existing browser and SQLite repositories                       | No parallel persistence; publication history round-trips with the World          |
| Newspaper and television             | One public-information digest projection                                       | Feature-local digest plus `headline` adapter into current surface projection     |
| Physical screen placement            | ENV scene slots and information-access declarations                            | Provide canonical `headline` payload only; no geometry or anchor edits           |
| Global navigation/placement          | UI-core / `PlayerGame` and shell                                               | Provide a feature-local panel and typed registration props; no global shell edit |
| Inline explanation                   | Existing typed-definition and semantic-control conventions                     | Stable typed civic references; read-only popover with focus return and Escape    |
| Person navigation                    | Canonical `EntityId` person references                                         | Emit a typed person action to the caller; never turn a person into glossary text |

## Implementation checkpoints

1. Add the pure public-information writer, correction writer, integrity checks,
   and digest/screen projections over ordinary history events.
2. Add feature-local digest and inline-reference components plus explicit
   UI-core and ENV adapters.
3. Prove actual event -> publication -> digest/supported television, exact
   recorded vote content, correction history, deterministic reopen and
   save/reload, and negative future/private/missing/commitment controls.
4. Prove glossary read purity, typed-person routing, keyboard/touch activation,
   focus return, and Escape behavior; run focused and repository gates.
5. Record final evidence, move this plan to completed, publish one draft PR,
   and leave it unmerged.

## Completion evidence

- Canonical NEWS-HELP2 simulation tests: 5 passed.
- Existing surface and browser repository regressions: 67 passed.
- Frozen history-byte and continuity regression run: 78 passed; one unrelated
  D-Lite test exceeded the shared-host five-second timeout and passed in 1.3
  seconds when rerun alone.
- Focused Chromium proof: 2 passed, covering keyboard, touch, initial focus,
  inline-help focus return, Escape, read purity, and canonical person routing.
- Prose corpus regenerated deterministically: 1,884 templates, 3,291
  unclassified candidates, zero hard errors; 40 corpus tests passed.
- `source:validate`, `source:replay`, production build, deterministic demo,
  `validate:art`, 329-item `inventory:art`, and `qa:art` passed.
- Two broad local validation attempts were preserved but collided with other
  repository-wide jobs on the shared host, producing unrelated five-second
  timeouts and restricted-port errors. The draft PR's exact-head CI is the
  uncontended full-suite authority; no polling or monitoring was scheduled.

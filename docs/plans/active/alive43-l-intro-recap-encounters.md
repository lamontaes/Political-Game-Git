# ALIVE43 L — world introduction, recap and lived encounters

Owner: Claude Code Desktop session `political-game-claude-runtime-proof-c9`
(Opus 5, High, Standard). Authority: ALIVE43 EXECUTION packet, ROLE L
(Drive 1JNF0N31QdWNwb1RTjoBX6czoNY3S6WlHFf5RHdwSh7g), accepted director choices
2 and 4 in ALIVE43 research section 12.

Receiver: LAND (Codex integration owner). Handshake: Drive
`ALIVE43 ROLE L — Intro/Recap/Encounters handshake — 2026-09-15`.
World contract: ROLE W session `political-game-claude-runtime-proof-77`,
`src/simulation/living-world/`, version `alive43-world/v1`.

## Source

- Base: main `70d76fb940c8b4a81ebdd1ec5834f96b8cb288bd` (#261 merge).
- Branch: `claude/alive43-l-intro-recap-encounters`.

## Owned

- `src/presentation/world-orientation*.ts`: pure reader over W's projection.
- `src/presentation/world-recap*.ts`: meaningful-change selection since the
  recorded presentation frontier.
- Additive event subjects in `src/presentation/conversation-subjects.ts`.
- Additive pin kinds, label resolver and old-ref compatibility in
  `shell-navigation.ts`, `browser-shell-state.ts` and `ShellPinRail.tsx`.
- New `src/player/WorldOrientation*`, `WorldRecap*` and encounter components.

## Excluded

`PlayerGame.tsx` root mount (LAND gets a separate patch), W producers, B
legislation binding, A art tooling, D-held people files, shared generated
prose union.

## Increments

1. L1: four-step orientation (executive, Congress, home state, locality).
   It can be skipped, stepped back and reopened. Reads the saved date. It never
   writes, advances time or materializes people.
2. L2: recap since the frontier after time advance. Preview is pure;
   acknowledge records consumption once. Event-aware conversation subjects
   have informed and uninformed controls.
3. L3: party chapter contact and follow-up via W2. Pinned organization,
   venue or activity reopens context; Visit, Attend and Act invoke existing
   writers explicitly.

## Status

- Handshakes: W acknowledged, and the draft contract was received. LAND
  handshake was posted to Drive, with no acknowledgement yet.
- Checks run: none yet.

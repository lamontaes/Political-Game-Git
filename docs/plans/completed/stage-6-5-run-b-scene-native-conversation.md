# Stage 6.5 Run B Scene-Native Conversation

## Status

Completed on `codex/stage-6-5-run-b-conversation` from accepted `origin/main`
at `5f27bccc759600968cd12d1610eb6f328fe84da8`; awaiting independent review on
the unmerged pull request.

## Bounded implementation

1. Extend the deterministic office fixture to a controlled player, two
   semantically present NPCs, explicit room presence, and separate valid scene
   anchors.
2. Add React-independent conversation session state for addressee, audibility,
   transcript display, collapse state, current beat, and local committed-turn
   ordinal. Keep canonical history and beliefs exclusively in `World`.
3. Add a deterministic conversation adapter that validates a stable session and
   turn key, resolves actual listeners, optionally evaluates an NPC decision,
   immediately records a durable trace, and composes the existing event, claim,
   knowledge, perception, and qualitative relationship writers.
4. Add Talk directly to each immediate person menu and render a compact
   lower-screen strip while preserving the accepted scene, shell, pins, dossier,
   civic-learning, focus, and keyboard behavior.
5. Add focused semantic tests, extend the existing Playwright harness, update
   affected authority, run the architecture audit and normal validation gates,
   inspect the browser result, and stop at an unmerged PR.
6. Incorporate live-play corrections before finalization: anchor contextual
   hover/focus labels to the person and suppress redundant labels, rename the
   subjective panel heading to `Your Read`, and present `Listen` as a non-spoken
   action with a bounded no-continuation state.
7. Generalize the existing person pin to Collins and Reed with deduplication,
   explicit size controls, unpin/re-pin, and keyboard access; clarify Cameron
   Foster as `You`; bind authored lines to topic, addressee, prior turn, intent,
   and outcome; state the briefing problem concisely; cap exhausted Listen; and
   add click-away dismissal for transient menus.

## Explicit boundaries

- No Stage 6 simulation semantics or snapshot version changes.
- No Stage 7 institutions, law, legislation, office authority, or calendar.
- No sub-day clock, fake elapsed time, or `World.actionSequence` timing use.
- No universal room, acoustic, dialogue, speech, or negotiation engine.
- No runtime LLM or network service.

## Validation evidence

- Focused Run A: 15 tests passed.
- Focused Run B: 32 tests passed.
- Full Vitest: 27 files and 367 tests passed.
- Playwright: 17 browser tests passed, including the live-play corrections.
- Full `npm run validate`: formatting, lint, type checking, tests, production
  build, deterministic demo replay, and art validation passed.
- Required art inventory and QA reports regenerated successfully.
- Human in-app browser inspection confirmed the scene remains visible, the
  ordinary conversation strip clears the bottom-left shell and right pins, and
  the explicit pin menu remains a restrained floating treatment.

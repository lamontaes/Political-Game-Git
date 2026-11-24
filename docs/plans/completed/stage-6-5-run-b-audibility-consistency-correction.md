# Stage 6.5 Run B Audibility Consistency Correction

## Status

Completed on the existing `codex/stage-6-5-run-b-conversation` branch and open,
unmerged PR #9 from independently audited head
`94ad34e62fd9b5f4fd54044c914f53fe7a20c916`.

## Bounded correction

1. Make hearing-dependent pending-response eligibility consume the same current
   resolved listener set used by event and knowledge consequences.
2. Preserve an unheard pending contribution without writing a response, event,
   claim, knowledge, or perception for that ineligible NPC.
3. Let the same pending contribution resolve exactly once when a later Normal
   turn legitimately includes that NPC as a listener.
4. Replace the narrow-checklist intent with self-contained player wording.
5. Add focused Quiet-versus-Normal semantics and browser proof, run every
   existing gate, and update the same open PR without merging.

## Preserved boundaries

- One immutable canonical `World`; only successful committed turns replace it.
- Existing bounded progression, concrete subject context, state-derived Listen,
  one settled-room beat, paged history, and no-scroll active layout.
- Existing date-only history, claims-versus-truth, epistemic privacy,
  deterministic replay, addressee/audibility separation, and listener-derived
  consequences.
- No universal acoustics/dialogue, strategic silence, authority/forms, Run C,
  Run D/sub-day time, Stage 7 work, pin redesign, or final art.

## Completion evidence

- Focused semantics: Run A 15/15; Run B 35/35.
- Quiet-to-Reed excludes Collins from actual listeners, event participants, and
  event/claim knowledge; Listen is unavailable and a rejected direct commit
  leaves both World and `collins-respond-to-reed` unchanged.
- The identical post-request World/progression under Normal includes Collins,
  exposes Listen, records Collins as respondent, grants consequences only to
  actual listeners, and consumes the pending contribution exactly once.
- Deterministic replay of the Normal resolution is exact; the next Listen is
  the single accepted settled-room beat and further Listen becomes unavailable.
- Browser proof: 18/18 Playwright tests passed, including the Quiet-versus-Normal
  path and the existing `scrollHeight <= clientHeight` active-box check. Live
  inspection confirmed the same player-facing transition.
- Full validation: formatting, lint, typecheck, 370/370 Vitest tests,
  production build, deterministic demo, and art validation passed.
- Required `inventory:art` and `qa:art` regeneration passed without changing
  the checked-in reports.

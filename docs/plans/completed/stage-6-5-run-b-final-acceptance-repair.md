# Stage 6.5 Run B Final Acceptance Repair

## Status

Completed on the existing `codex/stage-6-5-run-b-conversation` branch and open,
unmerged PR #9 from accepted Run B head
`2d36e788e5d30018f7705f960c525dc967e9a124`.

## Bounded repair

1. Add one fixture-specific conversation progression record for the shared
   intake-checklist briefing: concrete constituent-services subject facts,
   Collins support, Reed verification, latest proposition, pending NPC
   contributions, phase, and settled silence.
2. Make addressee changes project a continuation from that record instead of
   replaying a generic opening line.
3. Derive contextual intent copy and Listen availability from current
   progression state, removing the rejected universal two-Listen cap.
4. Make the single conversation box switch between active and paged history
   modes, with no internal vertical scrolling in normal desktop active play.
5. Replace rejected semantic/browser invariants, run all established gates,
   inspect the live player surface, and update the existing unmerged PR.
6. Ground the entire exchange in the same concrete fixture event: the county
   could not process two emergency-rent referrals because a required
   proof-of-income form was missing; Reed is checking the third and Collins is
   deciding whether to back a staff checklist before future referrals.

## Preserved boundaries

- One immutable canonical `World`; only successful committed turns replace it.
- Existing date-only history, listeners, claims, knowledge, perceptions,
  qualitative relationships, durable decision order, replay, and non-leakage.
- No universal dialogue/acoustic model, authority/forms system, strategic
  silence, final art, Run C, Run D/sub-day time, or Stage 7 work.

## Completion evidence

- Focused semantics: Run A 15/15; Run B 34/34.
- Full validation: formatting, lint, typecheck, 369/369 Vitest tests,
  production build, deterministic demo, and art validation passed.
- Browser proof: 17/17 Playwright tests passed. At the supported desktop
  viewport, the active conversation asserts `scrollHeight <= clientHeight`,
  rejects `auto`/`scroll` vertical overflow, and keeps the beat, contextual
  choices, addressee, audibility, and footer controls within the box. Paged
  history uses that same box.
- Live inspection confirmed the concrete constituent-services cue, Collins and
  Reed continuity, state-derived Listen, visible scene/shell/pins, and compact
  active layout. The fixture no longer exposes `referral gap` as player copy.
- Required `inventory:art` and `qa:art` regeneration passed without changing
  the checked-in reports.

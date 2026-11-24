# NEWS-PRESS4 — Public communication and interview loop

Status: implementation complete on `codex/news-help2` / PR #143; UI-core
composition pending on PR #144

## Authority and boundaries

- Execute section E of the FINISH-WAVE4 packet and the shared execution
  contract.
- Preserve UI-core PR #144 as the sole global navigation and placement owner.
  This branch supplies feature-local adapters and components only.
- Preserve #144's one legislative publication transition. Press publication
  uses the existing canonical `publishPublicEvent` writer and does not add a
  second legislative hook.
- Reuse the saved `World`, people, clock, scheduled activities, staff work,
  claims, events and publication history. Reading, preparing a projection or
  opening a component never publishes.
- Add no polling, opinion score, favorable-coverage promise, reporter
  impersonation, live headline import or automatic penalty for condensed play.

## Completed checkpoints

- [x] Recovered N-1 from the original ACCEPT-WAVE3 reviewer artifact.
- [x] Reproduced N-1 with a failing null-jurisdiction surface control.
- [x] Repaired N-1 and published the narrow checkpoint to PR #143.
- [x] Added explicit on-record, background and off-record glossary entries to
      the existing civic glossary.
- [x] Reused existing events, claims, schedules, work and publications; no new
      press-only history family was necessary.
- [x] Required an actual conversational pitch claim and arranged written or
      spoken interviews through existing people and scheduled-activity writers.
- [x] Routed preparation through an existing work item with an actual assigned
      adviser; accessible facts, likely follow-ups and response options remain
      advisory rather than predictive.
- [x] Supported interactive and condensed completion over the same records and
      outcomes, with condensed treated as presentation rather than refusal or
      penalty.
- [x] Required confirmation of consequential wording before any source claim
      or publishable response is committed.
- [x] Published only completed, eligible on-record/background material through
      the existing public-information writer; off-record material has no direct
      publication path.
- [x] Derived later feedback only from an actual saved publication and an actual
      assigned adviser's explicitly fallible interpretation.
- [x] Proved save/reload continuity, terms/attribution, exact wording,
      publication/correction history, negative disclosure/read controls, a
      shared digest/screen identity, and feature-local keyboard/touch/focus/
      Escape behavior.
- [x] Updated system documentation and prepared the frozen feature-local
      component/domain interface for UI-core #144.

## Verification

- Format, lint and TypeScript validation pass.
- PRESS4/public-information/surface regressions: 21/21 pass.
- Feature-local Playwright: 2/2 pass on isolated port 4197.
- The repository-wide run reached the full unit suite after passing format,
  lint and typecheck. It found the expected stale combined prose-corpus count,
  then was stopped when the shared queue owner reported that DEV still held the
  heavy slot. UI-core owns combined corpus regeneration; this donor does not
  edit that shared artifact concurrently.

## Journalism-practice grounding

The player-facing ground-rule explanations are neutral summaries of the
Associated Press's published interview and anonymous-source guidance and
Reuters' published journalistic standards. They explain negotiation and
attribution; they do not claim that every outlet uses identical definitions.

- https://www.ap.org/the-definitive-source/announcements/what-to-expect-when-youre-interviewed-by-ap/
- https://www.ap.org/about/news-values-and-principles/telling-the-story/
- https://reutersagency.com/about/standards-values/

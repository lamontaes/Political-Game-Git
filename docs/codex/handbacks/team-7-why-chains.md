# Team 7 Scene and Newspaper Why-Chain Review

## Disposition

The old #1187 research artifacts are not current-main evidence: its numerical art inventory and source manifest are absent, and C7 owns the current backdrop pipeline. This does not fully supersede the why-chain review. The findings below trace current presentation inputs and outputs; they do not assert observed gameplay failures or authorize new mechanics.

## Scene presence and activity

`src/presentation/backdrop-people.ts` places people from saved presence/work-schedule data into authored staging spots. `src/presentation/appearance-engine/pose-chooser.ts` derives `sceneActivity` from speaker identity, anchor type, and seated state; pose selection then uses a stable person seed for alternatives. This documents how the scene depicts activity. These paths do not establish a per-person recorded action or decision as the cause for each inferred posture, so a visual pose should not be treated as proof of that person's underlying intent or outcome.

## Newspaper selection

`src/presentation/news-front-page.ts` builds stories from `projectPublicInformationPanel` saved-publication records and preserves saved headline, body, and source identifiers. On the mixed page, ordering uses outlet scope when a reading habit exists, then publication recency; an outlet page likewise orders its saved stories by recency. Although event scale is projected onto the story model, the front-page sort does not use it. The displayed lead therefore traces to saved publication choice/time and outlet scope, not a demonstrated significance-based editorial decision.

## Limits and handoff

The old numeric/art inventory should remain out of this trace because C7 replaced that surface. This review makes no code change, does not claim that a recorded outcome producer is missing, and does not invent an alternative editorial or scene rule. Any future behavior change needs a source-backed producer/record for the relevant personal action or editorial choice and an approved output path.

# Stage 6.5 Run A Playable Slice

## Status

Completed — implemented, validated, pushed, and opened as unmerged PR #6 for
independent repository review and human play review.

## Baseline and boundaries

- Started from accepted `origin/main` at
  `a43b4bb3f2288324b76d4a8be252bd2a507a94b6`.
- Preserved frozen Stage 6 simulation semantics and strict snapshot compatibility.
- Kept Stage 7 institutions, law, legislation, and calendar systems gated.
- Retained the diagnostic viewer as an explicit development surface while making
  the political-office scene the normal entry point.
- Used only deterministic, repository-owned fixture imagery and typeset UI.

## Architecture spine

1. Added a pure presentation projection over the accepted simulation model. It
   exposes only facts justified as personally known, institutionally
   accessible, publicly discoverable, reported, inferred, or unknown.
2. Kept Run A interaction state separate from `World`. Reducer actions,
   learned-concept persistence, pin sizing, and deterministic view states do
   not change simulation time or history.
3. Composed one office scene from explicit scene anchors, a compatible seated
   pose, and occlusion metadata with a semantic placement validator.
4. Built the permanent shell, contextual person action menu, quick dossier,
   and one civic-learning concept as reusable accessible React components.
5. Proved the same deterministic fixture states through semantic tests,
   Playwright, and direct browser inspection.

## Deterministic fixture states

- normal office;
- person action menu open;
- quick dossier open;
- civic-learning popover open;
- mixed-density right pins;
- expanded bottom-left navigation;
- dark submenu state.

## Verification checklist

- [x] Pure epistemic projection filters a deliberately hidden canonical fact.
- [x] UI state transitions preserve the simulation date and append nothing.
- [x] Learned concepts persist only after an explicit action.
- [x] Manual pin sizing remains authoritative.
- [x] Person action menu is replaced by the dossier on Inspect.
- [x] Scene anchor, pose, scale, collision, and occlusion assertions pass.
- [x] Keyboard/focus paths cover the scene person, menu, dossier, learning, and
      navigation.
- [x] Existing Stage 6 tests and the full repository validation path stay green.
- [x] Playwright assertions and failure evidence pass in Chromium.
- [x] Art schemas, inventory, and QA fixture generation pass.
- [x] Repository architecture, roadmap, acceptance, and decision records match
      the implemented Stage 6.5 authority without reopening Stage 6.
- [x] Browser review passes the visual hard-rejection checklist.
- [x] A bounded branch is pushed and a new unmerged pull request is verified.

## Explicit non-goals

No dialogue system, legislation workspace, bill editing, calendar, news,
relationship web, election night, public-event system, home simulation,
onboarding flow, national scaling, full character generator, runtime generative
AI, save migrations, packaging, deployment, or Stage 7 work.

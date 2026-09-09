# EDU-PATH7 → UI owner

Recipient: task `Recover UI production integration` (01a083ce-50dc-7773-95b6-63d6bed75af8). Source-owner task01a08737-a1d3-7280-a238-7cb134cb2b75. LIFE and CAREER notified at outset.

Dependency pin: LIFE141cb3a97ae1f8e67f99740607434d368ffcc3f3005, composed into EDU at1a3b2ea. Main base701e68ca2fab1aa8b5a69b06c8e7ada312ae2aa3. UI inspected9f602f44e62ef04913a53515333dd03945c401f4. LAND keeps141/140 repair ownership; no EDU changes go into those PRs.

Apply only the EDU feature delta, then `git apply docs/integration/edu-path7-ui.patch`. It imports and mounts `EducationOptionsPanel` inside the existing LifePathsPanel. Existing Day and Work mounts already supply canonical world/onWorldChange and transition handlers. No App/PlayerGame/global-navigation edits are required.

The exact existing-file simulation patch adds `acceptedEducationPath` import and a program-prefix dispatch in `pathForRelationship`; it is three added lines. The resolver reads accepted terms from canonical evidence linked through the acceptance event to the enrollment. Existing LIFE actions continue to schedule/perform/charge/pause/return/complete. No provider lookup on reload.

Feature modules: `src/education/{types,compact,catalog,study-provider}.ts`, `src/simulation/education-study-terms.ts`, `src/player/EducationOptionsPanel.tsx`; runtime `public/education/manifest.json` and its three content-addressed files. Do not omit runtime files or mount a mock catalog. The source compiler and locked artifacts remain Node-only.

Normal route acceptance must include institution search, compare/detail, request offer, explicit acceptance, schedule/attend, interrupt, actual normal Save/reload, return and another session. Use pointer and keyboard. Normal opening is2026-01-05 (UI owner confirmed). The current-edition follow-up supplies actual HD2025/IC2025 provisional capability evidence for this date. Use this existing normal opening; do not add a historical-date control or backdate biography. Retain negative controls outside source windows.

`tests/e2e/edu-path7.spec.ts` exercises the feature diagnostic at `/edu-path7-proof.html`; this is a synthetic2026 world with real locked source data, not a normal-route acceptance claim. It must not be relabeled as normal production proof.

All degree/grade capabilities remain browseable with missing exact program/admission/prerequisite fields stated. Only reported noncredit categories create explicitly game-authored offers. No degree/license is conferred by these completion records. Historical founding, exact tuition and individualized admission remain unknown.

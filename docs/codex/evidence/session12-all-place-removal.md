# Hometowns share one place path; bargaining uses the chosen bill

Before: Lexington had a separate hometown record, economic binding and office labels. A members’ room entry without a docket could supply an authored Kentucky transit sitting.

After: A fresh hometown uses the Census place path. The members’ room requires an explicitly selected recorded bill. The legacy office button leads back to existing docket controls. Actual historical and sourced city identities remain in retained data.

## Replacements

Replaces: the separate searchable Lexington hometown with the shared Census locality.
Replaces: the named economic binding and duplicate finance prose with a shared canonical crosswalk catalog, Census-derived fallback and existing panel. Reviewed county/HUD relationships and metro membership remain data.
Replaces: fixed office and calendar labels with recorded place names and local-time wording.
Replaces: implicit authored transit entry with a recorded-docket requirement and existing player selection controls.
Replaces: inline sourced and retained fixture facts with shared data catalogs; their identities and geometry are preserved.

## Economic fact-retention correction

Independent source review on `3445972` found that the earlier passing tests expected lost facts: county/HUD same-jurisdiction relationships and MSA `30460` had disappeared, and retained hometown lookup returned null. Those tests were not acceptance evidence for economic retention.

The correction restores the reviewed provider binding in `src/presentation/generated/economic-context-crosswalks.generated.json`, keyed by canonical Census identity. `lifePlaceByRecordedKey` resolves a retained key through the existing retained catalog's source GEOID without making it searchable or changing saved hometown identity. Reviewed crosswalks take precedence; other places retain the shared Census fallback without inferred metro membership.

Focused correction checks pass nine tests across the nationwide binding, retained Personal finances and economic panel files. The original full typecheck was interrupted (reported exit -1, no diagnostics), and its defunct PID/resource evidence is retained in `session12-economic-retention-validation.json`; the separate retry with `NODE_OPTIONS=--max-old-space-size=6144 npm run typecheck` passed, including test-import resolution. Formatting, ESLint, zero-dice, report and dirty-candidate release checks passed. The bounded retry supplies the full typing gate. Direct comparison with reviewed base `139ed9935` verifies every provider fact is identical, with only the place key canonicalized. The prior Walsh browser proof remains at `3445972`, not the corrected head; no new browser result is claimed for this data/reader correction.

The added Personal finances regression renders the actual workspace, captures its panel binding, queries the real shipped provider and verifies the World remains byte-identical. Its panel boundary is mocked to capture props during server rendering; this is controlled reader evidence, not a browser capture or a new natural run.

| Correction file                                                         | Change                                                                                |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `src/presentation/generated/economic-context-crosswalks.generated.json` | Preserve the previously reviewed provider geography facts as runtime data.            |
| `src/presentation/economic-context-bindings.ts`                         | Read reviewed canonical crosswalks before the shared fallback.                        |
| `src/simulation/life-places.ts`                                         | Resolve recorded aliases through retained source identities, outside fresh selection. |
| `tests/nationwide/economic-context-nationwide.test.ts`                  | Restore county/HUD/metro fact assertions and retained-key parity.                     |
| `src/player/PersonalFinancesWorkspace.test.tsx`                         | Exercise retained hometown finance binding and real provider without World writes.    |

## Current-main composition

Session 9's independent receipt `6009463931` closes the economic regression at `b185eba`: nine affected tests and a separate saved/reloaded Personal finances receiver passed. Its older historical archive failed the unchanged integrity guard before rendering; historical rendering is unverified.

Normal composition `d2e2825` includes current main `d8dcd3a`, with merge-tree exit 0 and no manual conflict edits. Seventy-seven focused economics, docket and ordinary-place tests pass. Sequential 6 GiB-heap full typing, test-import resolution, changed-file lint/formatting, whitespace and zero-dice checks pass. The reviewed economic, consumer and docket files are byte-identical to `b185eba`.

Release checking now fails on the newer main Medicaid declaration's id/filename mismatch. This PR has no change to that file, and the same production parser reproduces the failure against immutable main bytes. The owner question is `6009558090`; the inherited declaration is preserved. `session12-economic-retention-composition.json` records the exact source, checks and remaining limits. The earlier Walsh browser proof remains at its named head; no composition-head browser or main landing is claimed.

B23 ownership moved to Session 41. Source-only head `f8d45f98d119f91db7b92994997491b89fd29587` preserves the existing CMS/FDIC inputs and acquisition limits. No catalog or additional institution writer is published by this PR.

## Measured checks and limits

The controlled supplied-seat regressions verify omitted-docket refusal without changing serialized World bytes, controlled-person validation, explicit broadband-bill entry, saved content identity and unchanged re-entry after reload. They do not prove a naturally won seat.

Full typing, changed-file lint and formatting, and zero-dice checks passed before browser capture. The focused final runner executed 92 assertions successfully; two suites failed at module initialization. The Run A follow-up passes all 16 tests after correcting a new import-order regression. The economic suite’s isolated module-load failure reproduces with unchanged base sources.

Two sampled family-bargaining campaign setups also fail on unchanged base sources with “This save has no recorded district leans.” They stop before the adapter. The six world snapshot/control failures and four Run D failures also reproduced on the base. No expected baseline hashes were changed to make these green.

The retention receipt measures 42 raw sourced municipal records, the frozen office scene, the retired physical family and three retained World fixtures. Each measured before/after hash matches. Expanded municipal research still contains 140 records.

The ordinary browser spec starts at eighteen in one town drawn from all 56 jurisdictions. It checks pointer/keyboard navigation and Save/Continue. Its runtime receipt and screenshots are recorded separately; a quiet new life does not establish seated bargaining.

No new annual run, timing reduction or save-size reduction is claimed. Observer draft 2190 remains separate and unmerged.

## File-by-file scope

| File                                                                         | Replacement or preservation                                                                                                      |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `docs/codex/evidence/session12-all-place-retention.json`                     | Shared place/data path, actual recorded identity, generic labels, or consumer/import migration.                                  |
| `docs/release/changes/shared-hometown-and-recorded-bill-entry.md`            | Shared place/data path, actual recorded identity, generic labels, or consumer/import migration.                                  |
| `scripts/source/export-economic-context.ts`                                  | Shared place/data path, actual recorded identity, generic labels, or consumer/import migration.                                  |
| `scripts/source/school-name-patterns.test.ts`                                | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `scripts/source/school-name-patterns.ts`                                     | Shared place/data path, actual recorded identity, generic labels, or consumer/import migration.                                  |
| `src/authoring/fixtures/dynamic-surface-authoring.ts`                        | Shared place/data path, actual recorded identity, generic labels, or consumer/import migration.                                  |
| `src/authoring/fixtures/production-asset-bank.ts`                            | Shared place/data path, actual recorded identity, generic labels, or consumer/import migration.                                  |
| `src/authoring/fixtures/production-scene-families.ts`                        | Shared place/data path, actual recorded identity, generic labels, or consumer/import migration.                                  |
| `src/authoring/generated/retained-asset-records.generated.json`              | Retained sourced or authored facts and actual identifiers, consumed through a shared data path.                                  |
| `src/authoring/generated/retained-family-records.generated.json`             | Retained sourced or authored facts and actual identifiers, consumed through a shared data path.                                  |
| `src/authoring/production-library.test.ts`                                   | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/cli/compare-seeds-options.ts`                                           | Shared place/data path, actual recorded identity, generic labels, or consumer/import migration.                                  |
| `src/devtools/seed-comparison.ts`                                            | Shared place/data path, actual recorded identity, generic labels, or consumer/import migration.                                  |
| `src/education/study-provider.test.ts`                                       | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/environment/environment-sources.ts`                                     | Shared place/data path, actual recorded identity, generic labels, or consumer/import migration.                                  |
| `src/environment/generated/retained-scenes.generated.json`                   | Retained sourced or authored facts and actual identifiers, consumed through a shared data path.                                  |
| `src/environment/generated/retained-source-records.generated.json`           | Retained sourced or authored facts and actual identifiers, consumed through a shared data path.                                  |
| `src/environment/scenes/office-council-staff-fixture.ts`                     | Shared place/data path, actual recorded identity, generic labels, or consumer/import migration.                                  |
| `src/player/CalendarWorkspace.tsx`                                           | Shared place/data path, actual recorded identity, generic labels, or consumer/import migration.                                  |
| `src/player/DistrictSeatFiling.test.tsx`                                     | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/player/EconomicContextPanel.tsx`                                        | Shared place/data path, actual recorded identity, generic labels, or consumer/import migration.                                  |
| `src/player/PanelTimeControls.test.tsx`                                      | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/player/PlayerGame.tsx`                                                  | Focus existing recorded-docket selection after legacy entry refusal; explicit bill handler unchanged.                            |
| `src/player/PlayerOffice.tsx`                                                | Shared place/data path, actual recorded identity, generic labels, or consumer/import migration.                                  |
| `src/player/ShellWorkspaces.tsx`                                             | Remove duplicate single-place finance prose; retain canonical all-place panel.                                                   |
| `src/player/municipal-directory.test.ts`                                     | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/player/time-command-runner.test.ts`                                     | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/presentation/adult-grounding.test.ts`                                   | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/presentation/appearance-recipe-v2.test.ts`                              | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/presentation/budget-economy.test.ts`                                    | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/presentation/campaign-integration.test.ts`                              | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/presentation/campaign-projection.test.ts`                               | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/presentation/creator-appearance-preview.test.ts`                        | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/presentation/creator-location.test.ts`                                  | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/presentation/dehardwire-packet-coherence.test.ts`                       | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/presentation/dehardwire-place-binding.test.ts`                          | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/presentation/districts13.test.ts`                                       | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/presentation/economic-context-bindings.ts`                              | Shared place/data path, actual recorded identity, generic labels, or consumer/import migration.                                  |
| `src/presentation/economic-context-panel.test.ts`                            | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/presentation/economic-context.ts`                                       | Shared place/data path, actual recorded identity, generic labels, or consumer/import migration.                                  |
| `src/presentation/generated/authored-bargaining-briefs.generated.json`       | Retained sourced or authored facts and actual identifiers, consumed through a shared data path.                                  |
| `src/presentation/generated/economic-context-catalog.generated.ts`           | Shared place/data path, actual recorded identity, generic labels, or consumer/import migration.                                  |
| `src/presentation/generated/retained-venue-aliases.generated.json`           | Retained sourced or authored facts and actual identifiers, consumed through a shared data path.                                  |
| `src/presentation/grammar-in-play.test.ts`                                   | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/presentation/incident-conditions.test.ts`                               | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/presentation/legislation-bundle-composition.test.ts`                    | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/presentation/legislation-composition.test.ts`                           | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/presentation/legislation-family-bargaining.test.ts`                     | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/presentation/legislative-action-authority.test.ts`                      | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/presentation/legislative-bargaining-brief.ts`                           | Shared place/data path, actual recorded identity, generic labels, or consumer/import migration.                                  |
| `src/presentation/legislative-bargaining-entry.test.ts`                      | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/presentation/legislative-bargaining-office-instruction.test.ts`         | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/presentation/legislative-bargaining-world.test.ts`                      | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/presentation/legislative-bargaining-world.ts`                           | Refuse omitted docket after controlled-person validation and before existing writers.                                            |
| `src/presentation/legislative-member-seat.test.ts`                           | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/presentation/legislative-office-context.test.ts`                        | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/presentation/life-conversation-contact.test.ts`                         | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/presentation/life-conversation-matters.test.ts`                         | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/presentation/life-talk-topics.test.ts`                                  | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/presentation/living-world-orientation-locality.test.ts`                 | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/presentation/macro-conditions.test.ts`                                  | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/presentation/meeting-tense.test.ts`                                     | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/presentation/modular41-repair.test.ts`                                  | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/presentation/modular45-people.test.ts`                                  | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/presentation/nationwide-local-governments.test.ts`                      | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/presentation/new-game-geography.test.ts`                                | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/presentation/new-game-geography.ts`                                     | Shared place/data path, actual recorded identity, generic labels, or consumer/import migration.                                  |
| `src/presentation/news-front-page.test.ts`                                   | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/presentation/opening-jurisdiction-identity.test.ts`                     | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/presentation/opening-story.test.ts`                                     | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/presentation/opening-world-snapshot.test.ts`                            | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/presentation/p2r2-sustained-play.test.ts`                               | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/presentation/place-hometown-population.test.ts`                         | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/presentation/place-start-summary.test.ts`                               | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/presentation/player-capabilities.test.ts`                               | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/presentation/player-spine.test.ts`                                      | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/presentation/playtest34-c.test.ts`                                      | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/presentation/playtest34-life.test.ts`                                   | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/presentation/practical-life-journey.test.ts`                            | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/presentation/pre-start-adult-history.test.ts`                           | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/presentation/prior-work-evidence.test.ts`                               | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/presentation/regional-opening-corpus.test.ts`                           | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/presentation/run-a-fixture.ts`                                          | Shared place/data path, actual recorded identity, generic labels, or consumer/import migration.                                  |
| `src/presentation/run-a.test.ts`                                             | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/presentation/run-b-conversation-progress.ts`                            | Shared place/data path, actual recorded identity, generic labels, or consumer/import migration.                                  |
| `src/presentation/run-b-fixture.ts`                                          | Shared place/data path, actual recorded identity, generic labels, or consumer/import migration.                                  |
| `src/presentation/run-c-working-document.ts`                                 | Shared place/data path, actual recorded identity, generic labels, or consumer/import migration.                                  |
| `src/presentation/run-d-lite.ts`                                             | Shared place/data path, actual recorded identity, generic labels, or consumer/import migration.                                  |
| `src/presentation/scene-consumers.ts`                                        | Shared place/data path, actual recorded identity, generic labels, or consumer/import migration.                                  |
| `src/presentation/scene-venues.ts`                                           | Shared place/data path, actual recorded identity, generic labels, or consumer/import migration.                                  |
| `src/presentation/small-talk-english.test.ts`                                | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/presentation/time-command.test.ts`                                      | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/presentation/time-target-label.test.ts`                                 | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/presentation/world-change-guard.test.ts`                                | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/presentation/world-recap-matters.test.ts`                               | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/presentation/world39-editorial.test.ts`                                 | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/simulation/authored-scenarios.generated.json`                           | Retained sourced or authored facts and actual identifiers, consumed through a shared data path.                                  |
| `src/simulation/campaigns.test.ts`                                           | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/simulation/character-history.test.ts`                                   | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/simulation/crisis/crisis-health-mortality.test.ts`                      | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/simulation/day-caller-child-parity.test.ts`                             | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/simulation/day-caller-migration.test.ts`                                | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/simulation/demo-jurisdiction-context.ts`                                | Shared place/data path, actual recorded identity, generic labels, or consumer/import migration.                                  |
| `src/simulation/demo.ts`                                                     | Shared place/data path, actual recorded identity, generic labels, or consumer/import migration.                                  |
| `src/simulation/executive-office-entry.test.ts`                              | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/simulation/executive-work.test.ts`                                      | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/simulation/gendered-given-names.test.ts`                                | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/simulation/governing/law-in-force-preemption.test.ts`                   | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/simulation/governing/question-authority-gate.test.ts`                   | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/simulation/governing/question-authority.test.ts`                        | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/simulation/jurisdiction-hierarchy.test.ts`                              | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/simulation/life-foundation.test.ts`                                     | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/simulation/life-places.ts`                                              | Shared place/data path, actual recorded identity, generic labels, or consumer/import migration.                                  |
| `src/simulation/macro-economy/crisis-origins.test.ts`                        | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/simulation/macro-economy/cycle-event-provenance.test.ts`                | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/simulation/macro-economy/macro-economy.test.ts`                         | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/simulation/nationwide-world/state-legislature-candidate-copies.test.ts` | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/simulation/office-qualification-rules.test.ts`                          | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/simulation/office-workflow.test.ts`                                     | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/simulation/player-facing-text.test.ts`                                  | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/simulation/school-names.ts`                                             | Shared place/data path, actual recorded identity, generic labels, or consumer/import migration.                                  |
| `src/simulation/state-jurisdiction-identity.test.ts`                         | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/simulation/world.test.ts`                                               | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `src/source/domains/municipal-governance/index.ts`                           | Shared place/data path, actual recorded identity, generic labels, or consumer/import migration.                                  |
| `src/source/domains/municipal-governance/national-corpus.ts`                 | Shared place/data path, actual recorded identity, generic labels, or consumer/import migration.                                  |
| `src/source/domains/municipal-governance/national-records.generated.json`    | Retained sourced or authored facts and actual identifiers, consumed through a shared data path.                                  |
| `src/source/domains/municipal-governance/research-aliases.generated.json`    | Retained sourced or authored facts and actual identifiers, consumed through a shared data path.                                  |
| `src/source/domains/municipal-governance/research-expansion.ts`              | Shared place/data path, actual recorded identity, generic labels, or consumer/import migration.                                  |
| `src/source/domains/sld-place-relations/identity.ts`                         | Shared place/data path, actual recorded identity, generic labels, or consumer/import migration.                                  |
| `src/source/domains/sld-place-relations/index.ts`                            | Shared place/data path, actual recorded identity, generic labels, or consumer/import migration.                                  |
| `src/source/domains/sld-place-relations/official-vectors.generated.json`     | Retained sourced or authored facts and actual identifiers, consumed through a shared data path.                                  |
| `src/source/domains/sld-place-relations/validate.ts`                         | Shared place/data path, actual recorded identity, generic labels, or consumer/import migration.                                  |
| `src/ui/DeveloperViewer.tsx`                                                 | Shared place/data path, actual recorded identity, generic labels, or consumer/import migration.                                  |
| `src/ui/EducationPathProof.tsx`                                              | Shared place/data path, actual recorded identity, generic labels, or consumer/import migration.                                  |
| `src/ui/scene-venue-exercise.ts`                                             | Shared place/data path, actual recorded identity, generic labels, or consumer/import migration.                                  |
| `tests/e2e/session12-all-place-removal.spec.ts`                              | Ordinary random-place pointer/keyboard and Save/Continue proof.                                                                  |
| `tests/fixtures/authored-scenario.ts`                                        | Explicit test-only scenario/binding data or dependent constructor/import migration.                                              |
| `tests/fixtures/economic-binding.ts`                                         | Explicit test-only scenario/binding data or dependent constructor/import migration.                                              |
| `tests/fixtures/executive-work-world.ts`                                     | Explicit test-only scenario/binding data or dependent constructor/import migration.                                              |
| `tests/fixtures/office-onboarding-world.ts`                                  | Explicit test-only scenario/binding data or dependent constructor/import migration.                                              |
| `tests/fixtures/recorded-legislative-term.ts`                                | Explicit test-only scenario/binding data or dependent constructor/import migration.                                              |
| `tests/nationwide-places.test.ts`                                            | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `tests/nationwide/city-minimum-wage-bill-terms.test.ts`                      | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `tests/nationwide/economic-context-nationwide.test.ts`                       | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `tests/source/economic-context.test.ts`                                      | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `tests/source/fiscal-authority-consumer.test.ts`                             | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `tests/source/place-demography.test.ts`                                      | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |
| `tests/source/sld-place-relations.test.ts`                                   | Dependent fixture input/import migration; canonical assertions retained unless the shared-place contract is explicitly asserted. |

## Method

Removal base: `ab009f288a67d2a8b7be12411fca8bf1232f91d3`. Current main `139ed9935bfaa970d59cbfb373068b65b0d2411c` was integrated without rewriting published branch history. Branch: `codex/session12-lexington-removal`. Focused receipts are under `test-results/session12/lexington-*.{json,log}`. Read-only base comparisons load original tracked sources through the existing Vite configuration; no second checkout or World advance was used for the retention comparison.

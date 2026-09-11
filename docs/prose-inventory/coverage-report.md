# Coverage discovery

This does not ask the adapters what they found. It walks the production source,
pulls every string literal out of the syntax tree, and asks of each one whether
the inventory has it. **100% is not claimed** — the number below that still
needs a person's judgement is the honest state of the check.

| Verdict | Count |
| --- | --- |
| INVENTORIED | 2107 |
| INTENTIONALLY_NON_PLAYER_FACING | 5458 |
| DIAGNOSTIC_OR_TEST | 4403 |
| **NEEDS_CLASSIFICATION** | **5588** |

Scanned 467 files holding 65498 string
literals in total; the table counts only those that read like a sentence.

## Trees not scanned, and why

- `src/simulation/municipal-rule-registry.generated.ts` — Generated admission projection of the municipal source inventory. Authored rule adapter prose remains inventoried at its original source, not duplicated in the transport.
- `src/simulation/municipal-governments.generated.ts` — Generated municipal source projection and provenance metadata, not authored prose. Authored municipal panels, histories and refusals are separately inventoried computed surfaces.
- `src/source` — The source substrate is cited evidence about the real world — statute text, agency tables, citations. It is not authored player prose and reaches the world only through a named one-way adapter.
- `src/authoring` — Authoring-time scene and asset tooling. Its strings describe art pipeline state to a developer, not a life to a player.
- `src/devtools` — Developer diagnostics. Reachable only from the developer view, which ordinary play never opens.
- `src/cli` — Headless command output for developers and CI.
- `src/release` — Build identity: the accepted release version and the source revision the bundle came from. Its strings are a version number and a commit hash, not authored prose, and the only player-visible form of them is a quiet vX.Y.Z the UI composes.
- `src/simulation/national-places.generated.ts` — Generated place-name data compiled from the Census places corpus. Names of real localities are sourced facts, not authored prose.

## Where the unclassified candidates are

| Candidates | File |
| --- | --- |
| 341 | `src/simulation/legislation-administration-families.ts` |
| 290 | `src/simulation/legislation-infrastructure-families.ts` |
| 269 | `src/simulation/legislation-fiscal-families.ts` |
| 236 | `src/simulation/legislation-resilience-families.ts` |
| 221 | `src/presentation/run-b-conversation.ts` |
| 214 | `src/simulation/executive-authority-rule-packs.ts` |
| 199 | `src/simulation/legislation-service-families.ts` |
| 126 | `src/simulation/legislation.ts` |
| 87 | `src/simulation/policy.ts` |
| 76 | `src/presentation/legislative-bargaining.ts` |
| 72 | `src/simulation/life-paths2.ts` |
| 69 | `src/simulation/character-history.ts` |
| 67 | `src/player/PlayerGame.tsx` |
| 64 | `src/simulation/press-interview-producers.ts` |
| 61 | `src/simulation/press-interviews.ts` |
| 59 | `src/presentation/legislative-dialogue-motifs.ts` |
| 59 | `src/simulation/adult-situations.ts` |
| 54 | `src/presentation/run-c-working-document.ts` |
| 51 | `src/simulation/resources.ts` |
| 50 | `src/simulation/judicial-office-content.ts` |
| 50 | `src/simulation/life.ts` |
| 49 | `src/simulation/campaigns.ts` |
| 49 | `src/simulation/life-sources.ts` |
| 45 | `src/content/content-export.ts` |
| 45 | `src/simulation/legislation-scenarios.ts` |
| 45 | `src/simulation/legislative-politics.ts` |
| 45 | `src/simulation/time-work.ts` |
| 43 | `src/presentation/legislative-bargaining-brief.ts` |
| 42 | `src/player/DocketWorkspace.tsx` |
| 42 | `src/simulation/demo.ts` |
| 40 | `src/simulation/decisions.ts` |
| 39 | `src/simulation/episode-bank.ts` |
| 39 | `src/simulation/player-model.ts` |
| 39 | `src/simulation/voice-bands.ts` |
| 37 | `src/simulation/setup-opening-bank.ts` |
| 36 | `src/simulation/world-metrics.ts` |
| 35 | `src/simulation/campaign-compliance.generated.ts` |
| 35 | `src/simulation/mind-catalog.ts` |
| 35 | `src/simulation/person-stress-harness.ts` |
| 35 | `src/ui/PoliticalProfile.tsx` |
| 34 | `src/presentation/scene-consumers.ts` |
| 34 | `src/simulation/civil-personnel.ts` |
| 34 | `src/simulation/life-episodes.ts` |
| 34 | `src/simulation/life-opportunities.ts` |
| 34 | `src/simulation/mind.ts` |
| 33 | `src/presentation/life-diagnostics.ts` |
| 32 | `src/content/adapters/legislative-blueprints.ts` |
| 31 | `src/content/adapters/life-episodes.ts` |
| 31 | `src/simulation/people.ts` |
| 31 | `src/simulation/politics.ts` |
| 30 | `src/simulation/life-paths2-catalog.ts` |
| 30 | `src/simulation/person-context.ts` |
| 29 | `src/presentation/run-d-lite.ts` |
| 28 | `src/content/adapters/simulation-catalogs.ts` |
| 28 | `src/simulation/executive-work.ts` |
| 28 | `src/ui/MindProfile.tsx` |
| 27 | `src/presentation/garment-fit.ts` |
| 26 | `src/presentation/legislation-session.ts` |
| 25 | `src/presentation/economic-graphs.ts` |
| 25 | `src/simulation/judicial-office-work.ts` |
| 25 | `src/ui/DeveloperReviewHub.tsx` |
| 24 | `src/content/adapters/legislative-rule-packs.ts` |
| 24 | `src/presentation/browser-world-repository.ts` |
| 24 | `src/presentation/civic-glossary.ts` |
| 24 | `src/ui/ContentBrowserView.tsx` |
| 23 | `src/presentation/title-tableau.ts` |
| 23 | `src/simulation/life-content-92c.ts` |
| 21 | `src/simulation/legislation-content-contracts.ts` |
| 20 | `src/presentation/economic-context-browser.ts` |
| 20 | `src/presentation/legislative-bargaining-actions.ts` |
| 20 | `src/simulation/candidacy-packs.ts` |
| 20 | `src/ui/SceneGalleryView.tsx` |
| 19 | `src/presentation/run-a-fixture.ts` |
| 19 | `src/simulation/legislative-member-decisions.ts` |
| 19 | `src/simulation/life-integrity.ts` |
| 19 | `src/simulation/setup-young-life-bank.ts` |
| 19 | `src/simulation/situation-profiles.ts` |
| 19 | `src/simulation/world.ts` |
| 18 | `src/content/adapters/setup-questionnaire.ts` |
| 18 | `src/player/CalendarWorkspace.tsx` |
| 18 | `src/simulation/records.ts` |
| 17 | `src/content/adapters/conversation-subjects.ts` |
| 17 | `src/player/ConversationStrip.tsx` |
| 17 | `src/player/MeasurePaperWorkspace.tsx` |
| 17 | `src/presentation/legislation-estimate-action.ts` |
| 17 | `src/simulation/executive-governing-kernels.ts` |
| 17 | `src/simulation/incident-response.ts` |
| 17 | `src/ui/CharacterProofView.tsx` |
| 16 | `src/player/PressInterviewPanel.tsx` |
| 16 | `src/player/WorkingDocumentWorkspace.tsx` |
| 16 | `src/presentation/run-a-projection.ts` |
| 16 | `src/simulation/policy-semantics.ts` |
| 16 | `src/ui/EventHistory.tsx` |
| 16 | `src/ui/SceneDebugOverlay.tsx` |
| 15 | `src/player/LifePathsPanel.tsx` |
| 15 | `src/presentation/legislation-docket.ts` |
| 15 | `src/simulation/narrative-threads.ts` |
| 14 | `src/player/EconomicContextPanel.tsx` |
| 14 | `src/presentation/conversation-subjects.ts` |
| 14 | `src/presentation/legislation-analysis.ts` |
| 14 | `src/presentation/legislative-member-seat.ts` |
| 14 | `src/presentation/pose-control-plate.ts` |
| 14 | `src/presentation/surface-projection.ts` |
| 14 | `src/simulation/incidents.ts` |
| 14 | `src/ui/CandidateAdmissionReview.tsx` |
| 13 | `src/player/OfficeScene.tsx` |
| 13 | `src/player/WorkPendingWorkspace.tsx` |
| 13 | `src/presentation/campaign-compliance-projection.ts` |
| 13 | `src/simulation/election-contests.ts` |
| 13 | `src/simulation/resource-integrity.ts` |
| 12 | `src/content/adapters/ordinary-life.ts` |
| 12 | `src/player/PermanentShell.tsx` |
| 12 | `src/simulation/history.ts` |
| 12 | `src/simulation/quantity.ts` |
| 12 | `src/simulation/vitality.ts` |
| 11 | `src/content/adapters/life-situations.ts` |
| 11 | `src/player/PublicInformationPanel.tsx` |
| 11 | `src/presentation/run-b-conversation-progress.ts` |
| 11 | `src/presentation/scene-placement.ts` |
| 11 | `src/simulation/life-places.ts` |
| 11 | `src/simulation/political-belief-formation.ts` |
| 11 | `src/ui/SceneAuthoringProofView.tsx` |
| 10 | `src/player/MeasureFloorSurface.tsx` |
| 10 | `src/presentation/life-record.ts` |
| 10 | `src/simulation/office-qualification-rules.ts` |
| 10 | `src/simulation/production-catalog.ts` |
| 10 | `src/simulation/setup-questionnaire-bank.ts` |
| 10 | `src/ui/CausalTraceView.tsx` |
| 10 | `src/ui/PeopleVisual4Review.tsx` |
| 9 | `src/presentation/production-world.ts` |
| 9 | `src/presentation/surface-binding.ts` |
| 9 | `src/simulation/campaign-compliance.ts` |
| 8 | `src/player/PinRail.tsx` |
| 8 | `src/player/PlayerOffice.tsx` |
| 8 | `src/presentation/legislative-bargaining-world.ts` |
| 8 | `src/presentation/legislative-office-context.ts` |
| 8 | `src/presentation/ordinary-life.ts` |
| 8 | `src/presentation/player-capabilities.ts` |
| 8 | `src/simulation/future-transitions.ts` |
| 8 | `src/simulation/incident-catalog.ts` |
| 8 | `src/simulation/public-information.ts` |
| 8 | `src/ui/DeveloperViewer.tsx` |
| 8 | `src/ui/PersonInspector.tsx` |
| 8 | `src/ui/PoseContactProof.tsx` |
| 7 | `src/player/QuickDossier.tsx` |
| 7 | `src/presentation/candidate-review.ts` |
| 7 | `src/presentation/new-game.ts` |
| 7 | `src/presentation/player-conversation.ts` |
| 7 | `src/simulation/candidate-qualification.ts` |
| 7 | `src/simulation/executive-work-entry.ts` |
| 7 | `src/simulation/judicial-office-start.ts` |
| 6 | `src/player/ModularCharacter.tsx` |
| 6 | `src/player/PersonAppearanceControls.tsx` |
| 6 | `src/presentation/component-masters.ts` |
| 6 | `src/presentation/formative-context.ts` |
| 6 | `src/presentation/formative-play.ts` |
| 6 | `src/presentation/legislative-bargaining-fixture.ts` |
| 6 | `src/presentation/raster-tiers.ts` |
| 6 | `src/presentation/run-b-fixture.ts` |
| 6 | `src/presentation/scene-composition.ts` |
| 6 | `src/simulation/names-data.ts` |
| 6 | `src/simulation/vitality-integrity.ts` |
| 6 | `src/ui/ProductionOfficeProofView.tsx` |
| 5 | `src/player/CampaignWorkspace.tsx` |
| 5 | `src/player/CivilPersonnelPanel.tsx` |
| 5 | `src/player/LegislationWorkspace.tsx` |
| 5 | `src/player/TitleTableau.tsx` |
| 5 | `src/presentation/browser-world-repository-protocol.ts` |
| 5 | `src/simulation/causal-effects.ts` |
| 5 | `src/simulation/incident-response.fixture.ts` |
| 5 | `src/simulation/municipal-election-rules.ts` |
| 5 | `src/ui/ScenePresentationProofView.tsx` |
| 4 | `src/persistence/sqlite-world-repository.ts` |
| 4 | `src/player/ExecutiveWorkWorkspace.tsx` |
| 4 | `src/player/TitleScreen.tsx` |
| 4 | `src/presentation/executive-work.ts` |
| 4 | `src/presentation/setup-questionnaire-flow.ts` |
| 4 | `src/simulation/person-identity.ts` |
| 4 | `src/simulation/portability-fixture.ts` |
| 4 | `src/simulation/relationship-integration.ts` |
| 4 | `src/simulation/resource-pressure.ts` |
| 4 | `src/simulation/vitality-catalog.ts` |
| 3 | `src/player/JudicialOfficeWork.tsx` |
| 3 | `src/player/SceneBackdrop.tsx` |
| 3 | `src/presentation/economic-context.ts` |
| 3 | `src/presentation/legislation-composition.ts` |
| 3 | `src/presentation/life-introduction.ts` |
| 3 | `src/presentation/life-story.ts` |
| 3 | `src/presentation/production-office.ts` |
| 3 | `src/simulation/candidacy.ts` |
| 3 | `src/simulation/demo-jurisdiction-context.ts` |
| 3 | `src/simulation/judicial-gameplay-kernels.ts` |
| 3 | `src/simulation/legislation-drafting.ts` |
| 3 | `src/simulation/life-callbacks.ts` |
| 3 | `src/simulation/life-choice-evidence.ts` |
| 3 | `src/simulation/perception.ts` |
| 3 | `src/simulation/policy-decision.ts` |
| 3 | `src/ui/WorldControls.tsx` |
| 2 | `src/player/IncidentResponsePanel.tsx` |
| 2 | `src/presentation/character-proof.ts` |
| 2 | `src/presentation/legislation-docket-selection.ts` |
| 2 | `src/presentation/life-scene-people.ts` |
| 2 | `src/presentation/scene-proof.ts` |
| 2 | `src/presentation/surface-review.ts` |
| 2 | `src/presentation/title-ambient.ts` |
| 2 | `src/simulation/evidence-integrity.ts` |
| 2 | `src/simulation/executive-work-context.ts` |
| 2 | `src/simulation/life-eligibility.ts` |
| 2 | `src/simulation/office-qualifications.generated.ts` |
| 2 | `src/ui/LifePaths2Proof.tsx` |
| 2 | `src/ui/PeopleList.tsx` |
| 1 | `src/player/PersonPortrait.tsx` |
| 1 | `src/player/PlayerConversation.tsx` |
| 1 | `src/player/SceneSurfaceLayer.tsx` |
| 1 | `src/presentation/adult-life.ts` |
| 1 | `src/presentation/campaign-projection.ts` |
| 1 | `src/presentation/legislation-projection.ts` |
| 1 | `src/presentation/legislative-session-window.ts` |
| 1 | `src/simulation/commitment-seam.ts` |
| 1 | `src/simulation/public-information-integrity.ts` |
| 1 | `src/simulation/setup-questionnaire.ts` |
| 1 | `src/simulation/situation-selection.ts` |

Each candidate is listed in full, with its reason, in `coverage-candidates.json`.

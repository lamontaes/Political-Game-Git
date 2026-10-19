# Screens (src/presentation, src/player, src/ui, App.tsx) as consumers of world state

Scope note: the tool's "screens" engine is 5,981 units (2,167 RULE, 1,638 TYPE, 1,216 PLUMBING, 550 DEAD, 410 DATA). Almost every "RULE" here is a UI helper, not simulation logic. Real rule logic lives in src/simulation and is owned by other engines.

## 1. SAMPLE AUDIT

(For this engine I count "view/format/React/cache" code as PLUMBING, because core2 will not port it; it is rebuilt on adapters.)

- src/presentation/legislation-docket.ts:227 chamberDisplayName TOOL=RULE YOU=PLUMBING label lookup in legislative blueprint, try/catch
- src/presentation/browser-shell-state.ts:55 PIN_SIZES TOOL=RULE YOU=DATA UI enum list, no decision
- src/player/WorldOrientationPanel.tsx:997 recordedWork TOOL=RULE YOU=PLUMBING string capitalization for display
- src/player/World39News.tsx:208 PublicNotices TOOL=RULE YOU=PLUMBING React component rendering notice list
- src/presentation/work-uniform.ts:58 SITTING_JUDGES TOOL=RULE YOU=PLUMBING WeakMap cache keyed by World object
- src/presentation/new-game-geography.ts:122 geographyWorldOriginForPlaceKey TOOL=RULE YOU=DATA table lookup with default
- src/maps/map-preferences.ts:41 MODES TOOL=RULE YOU=PLUMBING Set of keys for validating stored prefs
- src/player/ConversationStrip.tsx:30 ConversationStrip TOOL=RULE YOU=PLUMBING React view over conversation state, 323 lines
- src/presentation/dress-code.ts:62 placeRule TOOL=RULE YOU=DATA regex table lookup for clothing
- src/player/useRasterTier.ts:32 useRasterTier TOOL=RULE YOU=PLUMBING React hook choosing image resolution
- src/player/SavedAppearance.tsx:42 SavedAppearanceProvider TOOL=RULE YOU=PLUMBING React context provider alias
- src/presentation/scene-composition.ts:192 composeSceneCharacter TOOL=RULE YOU=PLUMBING art compositor, poses and layers, no sim
- src/presentation/state-executive-term-description.ts:39 yearsWord TOOL=RULE YOU=PLUMBING prose formatting of a number
- src/presentation/day-overview.ts:265 offersAwaitingAnswer TOOL=RULE YOU=PLUMBING adapter reading work history into a list
- src/presentation/browser-world-repository-protocol.ts:187 SLOT_UNREADABLE TOOL=RULE YOU=PLUMBING save-slot error message string
- src/presentation/formative-context.ts:43 COMPANION_ROLES TOOL=DATA YOU=DATA situation-to-companion table
- src/presentation/day-clothing.ts:15 STAFF_WEAR TOOL=DATA YOU=DATA scene-to-wear table
- src/presentation/press-request.ts:17 PRESS_REQUEST_STANCES TOOL=DATA YOU=DATA enumerated player stances
- src/presentation/run-d-lite.ts:432 rescheduleRunDFlexibleBlock TOOL=PLUMBING YOU=PLUMBING fixture wrapper over rescheduleScheduledActivity
- src/presentation/run-b-conversation.ts:353 createConversationSessionDescriptor TOOL=PLUMBING YOU=PLUMBING keys session by history.nextSequence
- src/presentation/life-scene-flow.ts:146 definitionAtStage TOOL=PLUMBING YOU=PLUMBING trivial wrapper that throws
- src/presentation/politics-government.ts:815 vacancyNote TOOL=PLUMBING YOU=PLUMBING scans world.history.events for a tag
- src/presentation/life-scene-people.ts:209 resolveSavedWardrobe TOOL=PLUMBING YOU=PLUMBING wardrobe and pose resolution for rendering
- src/player/SavedAppearance.tsx:55 savedRenderSnapshots TOOL=PLUMBING YOU=PLUMBING builds render snapshots per person
- src/devtools/trace-adapters.ts:1535 decisionTraceNode TOOL=PLUMBING YOU=PLUMBING maps decision trace to inspector node
- src/presentation/legislation-world.ts:533 applyLegislativeCommand TOOL=PLUMBING YOU=PLUMBING player command dispatch; refusals belong to legislatures
- src/authoring/asset-bank.ts:435 AssetBankParseError TOOL=DEAD YOU=DEAD used only by art-factory scripts (grep: src/authoring, scripts/)
- src/player/PeopleRelationshipWeb.tsx:184 WebNode TOOL=DEAD YOU=DEAD file never imported anywhere (grep import: none)
- src/presentation/economic-context.ts:77 economicContextPlaceKeys TOOL=DEAD YOU=DEAD only economic-context.test.ts:110 calls it
- src/presentation/appearance-engine/extract.ts:133 COLLAR_REACH TOOL=DEAD YOU=DEAD extract.ts imported only by scripts/appearance/*

agreement 15/30. All 15 disagreements are the tool's "RULE [pure-helper]" label. It calls any function without a World parameter RULE: React components, hooks, string formatters, caches, constants. In this engine nearly the whole RULE class (2,167) should be read as PLUMBING (view) or DATA; true decision logic is a few dozen units. The DEAD calls were right but mean "dead for the game," not "dead for art tooling."

## 2. MAP: how screens read and write the old World

Size: 585 non-test files in presentation + player (404 + 178 + 3), plus 27 in src/ui. 451 of the 585 (77%) import src/simulation. Across presentation, player, ui and App.tsx, 469 files import from simulation (331 through the barrel `simulation/index`).

Read paths (each needs an adapter onto core2 state + knowledge):

- Direct `world.history.*` scans: 751 `world.history` references and 872 `.history.` references in 197 files. Across 103 distinct table names. Top: events 217, scheduledActivities 78, nextSequence 63, legislativeMeasures 53, knowledge 41, personDeaths 25, workRelationships 18, electionContests 17, relationshipInteractions 15, organizations 13, memories 11. Example: politics-government.ts:815 scans `history.events.find`.
- Direct entity records: `world.people[...]` 475 references, `world.jurisdictions` 63, `world.currentDate` 674, `world.currentMoment` 164, `world.control` 228, `world.seed` 57, catalogs (policy 18, mind 3, metric 4).
- Simulation query modules: life-queries (35 files), queries.ts (10), resource-queries (8), campaign-queries; plus about 20 more domain query modules (municipal-government 14, time-work 14, state-reference 12, life-opportunities 12, legislation 13).
- Presentation view-model builders: 124 `export function project*`; examples public-information-adapters.ts:33 (`projectPublicInformationPanel`), day-overview.ts, surface-projection.ts, campaign-projection.ts, legislation-projection.ts. These take whole `World` and are the main seam.
- Knowledge gating: only about 50 files touch `history.knowledge` or equivalent. Good model: person-dossier.ts:371-400 (known = accurate knowledge record, or public event; `revealAll` for observer). Most other screens read the record omnisciently and filter by hand.
- Observer mode (`control.kind: "observer"`, types.ts:3787) is a separate read path (observer-world.ts, ObserverWorkspace.tsx); in core2 this is the "observer mode" view.

Top 30 simulation modules imported, by number of distinct files (presentation, player, ui, App.tsx, any import form): types 125 (type-only mostly), life-queries 35, dates 27, people 20, life-places 20, world 16, time-work 14, person-appearance 14, municipal-government 14, legislation 13, state-reference 12, life-opportunities 12, municipal-public-work 11, legislation-program-families 11, ids 11, queries 10, money-text 10, relationship-standing 9, people-traits 9, legislative-procedure-world 9, school-stages 8, scene-bindings 8, resources 8, resource-queries 8, relationship-contact 8, play-settings 8, legislation-drafting 8, governing/state-governing 8, campaigns 8, tax-policy 7. Also serialization 7.

Write path (see section 5): 45 presentation/player files call writers (`recordWorldEvent` in 30 files, `advanceWorldMinutes`/`advanceWorld`/`advanceWithWorldIntegrityAtEnd` in 21). 339 `onWorldChange` references in 64 files. About 66 `...world` spreads in screens, so screens sometimes copy the World themselves.

Other consumers: browser-world-repository.ts (1,947 lines) saves and loads the whole World to browser slots (save-format risk). devtools/trace-adapters.ts (2,223 lines) reads decision traces and history for the inspector.

## 3. STOPGAPS

Marker counts in screens code (presentation, player, ui, App, maps, connectivity, devtools, authoring): SET BY HAND 1, GAME ASSUMPTION 0, NOT MODELED 0, PLACEHOLDER 35 (10 files, plus 25 in authoring/fixtures/measured-geometry.ts art fixture). Most important:

- contextual-scene-producers.ts:104 SET BY HAND town-hall question window
- production-world.ts:256 PLACEHOLDER same-sex share and parent death rates unresearched (start-of-life builder)
- life-talk-topics.ts:36 PLACEHOLDER what counts as news, how a listener answers
- life-talk-running.ts:43 PLACEHOLDER interim reply copy
- social-invitation.ts:31 PLACEHOLDER why ordinary invitations happen
- law-effects-prose.ts:122 PLACEHOLDER effect of a law part awaiting research
- ordinary-meeting-actions.ts:313 PLACEHOLDER fifteen-minute short visit
- legislative-bargaining.ts:701 PLACEHOLDER times-8 counteroffer multiple
- place-backdrops.ts:119, :153 PLACEHOLDER sunrise/sunset by month; "one day in five rainy" for every place
- transit-report-reading.ts:12 PLACEHOLDER attention time to read a report
  Randomness: no dice deciding outcomes in play. Seeded picks all create the opening life or choose prose: production-world.ts:868 (SeededRng household, siblings, classmates; `rng.pick` at :1228), opening-prior-service.ts:119-121 (`rng.pick` prior office and term, a seeded pick among real options), legislation-docket.ts:1057 (generated person name), conversation-subjects.ts:892 (wording variant), observer-world.ts:55-63 (picks observer place), bank-english.ts:54 and talk-choice-english.ts:137 (stableHash wording picks), appearance-engine hashes. `Math.random`: browser-world-repository.ts:1795 (id), CreatorAppearanceStep.tsx:151,160 (randomize button), DeveloperViewer.tsx:86 (suffix). Place names in logic: lexington/Kentucky only in fixtures and copy (run-a-fixture.ts:15, new-game-geography.ts:218 regression setup, run-c-working-document.ts); hard-coded in player copy: CalendarWorkspace.tsx:105-109 "Lexington time", PlayerOffice.tsx:608; ShellWorkspaces.tsx:1608 says only Lexington has economic context (economic-context.ts imports economic-context-lexington.json only); municipal-directory.ts:37 holds a state-name table. These violate one-rule-all-places.

## 4. KEEPERS

Screens hold few pure rules; these are the ones to carry over:

- world-change-guard.ts:25-41 `createWorldChangeGuard.admit`: stale-request guard (a control built on an old state cannot commit). Takes World identity; in core2 take a state version number.
- time-command.ts:477 `submitTimeCommand` plus :185 `previewTimeCommand`: stale check, disclose target before click, refuse/accept receipt. Entangled with World; in core2 takes a calendar and the controller's known calendar items.
- quiet-stretch.ts:69 `nextKnownCalendarItem`, :139 `capQuietStretch`, :241 `blockingHoldsToday`: time never runs past the next thing on the player's own calendar. Needs the person's known commitments.
- interruption-policy.ts:42-120 and offer-deadlines.ts:40-138: categories that stop time (press requests, offer deadlines). Pure over event kinds; becomes a stop-condition list in the controller.
- player-capabilities.ts:92 `resolvePlayerCapabilities`: which surfaces a life earns (age, work, legislative office, candidacy by residence). Reads World; in core2 it is the player's act filter from person facts.
- person-dossier.ts:371-400: knowledge attribution rule (known / public record / heard-not-accurate does not reveal private biography). Port as the knowledge gate for all adapters.
- life-scene-flow.ts:516-523 `chooseOpeningLifeScene` control guard ("Only the player can choose") and prerequisite recheck; life-episodes.ts:2242 `playEpisodeOption` rechecks eligibility before applying (simulation, but the pattern is the offer-then-validate contract).
- day-overview.ts:265 `offersAwaitingAnswer`: lists expected-start work relationships still answerable; entangled, adapter over core2 job offers.
- scene-player-presence.ts:3 and life-scene-people.ts `planLifeScenePeople`: which real people appear in a scene. Needs peopleByPlace index plus knowledge.

## 5. CORE2 MODULE INPUTS: adapter layer and controller

### Adapter layer spec

- A view model is a pure function `(core2State, controllerPersonId, asOfMoment, viewRequest) -> ViewModel`. It may read only (a) the player's `knowledgeByPerson` facts (perceived/told/public/self), (b) public record of places the player can see, (c) the player's own person record, needs, goals, relationships. It never reads another person's private state. It spends no game time, writes no state, creates no facts (preserves the existing read-only rule from AGENTS.md).
- Observer mode: same signature with `controller = observer`, reading the retained log and public record, not one person's knowledge.
- Tables the adapters index: person card/dossier (knowledgeByPerson + relationshipsByPerson), people here (peopleByPlace filtered by what the player perceives), calendar (own commitments, callbacks), money (own accounts), work (own jobs), offers (ActOffers addressed to the player), news/press (retained log), politics/government (publicOrganizations + public record), legislation (public record of measures), place/economy (parameter table + observed values). Roughly 124 `project*` builders collapse to about a dozen adapters; the old per-system builders become renderers over typed events.
- Each adapter returns ids plus typed facts. Prose stays in the English engine; screens never invent facts absent from the packet.
- Replacement for history scans: screens must not scan logs. Adapters read indexes (per person, per place, per kind) and a `sinceSequence` cursor, so no whole-history scans (speed budget).
- Distinct read paths to adapt: about 6 families (history tables, entity records, query modules, projection builders, knowledge-gated dossier/news, observer) covering 103 history tables, 2 entity maps (people, jurisdictions) and about 35 query/domain modules. Adapter inventory: people/relationships, calendar/time-work, money/resources, work/careers, education/life-paths, politics/government, legislation, campaigns/elections, press/news, places/scenes, health/vitals, devtools trace.

### Controller spec (player is a person like any other; only the chooser differs)

- Today: a click builds a next World with a presentation or simulation function and calls `onWorldChange(next)` in PlayerGame.tsx (:1157, :1380, committed through a stale-guard at world-change-guard.ts and `setSession`). Time passes through `submitTimeCommand` (time-command.ts:477) to `passOrdinaryDays` (ordinary-life.ts:370) or `advanceWorldMinutes`. Writers called directly from screens: recordWorldEvent (30 files), applyCharacterHistoryPlan, recordRelationshipInteraction, createWorkItem, introduceMeasure, fileCampaign, answerContact, openFavorAsk, fileClemencyPetition, takeFloorVote. Gate: `world.control` person check (228 refs).
- core2: `Controller` registered per personId. The shared life loop asks the chooser for that person's pick from ActOffers. Player controller returns "waiting" until the UI submits `{offerId | actKind, targetIds, parameters, stateVersion}`; the loop validates it against the same offer list and eligibility rules, then applies the same effectHandlers. A stale `stateVersion` is refused with no change (replaces the WorldChangeGuard). Time requests are a separate `advance(until)` command that runs the loop and returns early at stop conditions (key time-of-commitment, press request, offer deadline, death, election result) read from the player's known calendar.
- The controller sees only the player's offers. UI choices (scene options, conversation intents, legislative commands, calendar holds) are rendered ActOffers; refusal text is reason codes from eligibility rules.
- Persistence: a core2 save is state plus retained log; browser-world-repository must change (whole-World slot) and handle unreadable slots.

### State owned and events

- Screens own only UI state (pins, shell route, drafts, wardrobe preferences). In core2 that stays in the client; wardrobe/appearance preference becomes a person record field.
- Events emitted to screens: all come from other modules. Screens subscribe to the retained log and to `callbacks` for the "moment" interruptions.
- Calendar/tier: screens drive daily tier for the player circle and focus place.
- Data reused: scene catalogs, dress-code and wear tables, economic-context JSON per place, glossary, English banks (separate engine).

## 6. DEPENDENCIES AND RISKS

Needs first: people/relationships, time-work (calendar), knowledge model, the English engine, and each domain module's offerProviders (careers, education, legislatures, campaigns, press) so there is anything to click.
Riskiest parts:

1. 751 + 872 `history` references in 197 files: unindexed scans of 103 tables; each needs an index or retained log. Hidden coupling by tag strings (politics-government.ts:815 matches `provenance:fictional-initial-vacancy`).
2. Omniscient reads: most screens show the record rather than what the player knows; knowledge gating will change what existing screens display and break tests that assume full visibility.
3. Whole-World save and `setSession`/stale guard assumptions (browser-world-repository.ts, 1,947 lines; world-change-guard.ts); session keys use `history.nextSequence` (run-b-conversation.ts:353).
4. Direct writers in presentation (45 files) mix rules, effects and UI; effects must move into module effectHandlers rather than be wrapped.
5. Place-specific data in code (Lexington economic JSON, CalendarWorkspace "Lexington time", municipal-directory state names).
6. Starting-world builder production-world.ts (1,749 lines) uses SeededRng and placeholders; becomes core2 world generation.

## 7. LIFE-REPLAY STEPS

Screens supply no mechanism; they supply the player's way to choose it. The controller must submit each as an ActOffer. Present UI today: employment (CareerPathsPanel, day-overview offersAwaitingAnswer), education-enrollment and completion (LifePathsPanel, study progression), residence-move (place-travel.ts:55, DistrictResidencePanel), candidacy (CongressCandidacySection, nationwide-candidacy), cause-participation (campaign-life-actions, party-chapter-actions), legislative-proposal and law-signature (legislation-docket, legislation-world.ts:533), chamber-leadership and office-service (PlayerOffice, legislative-office-context), election-result (own-election.ts), public-appointment (office-transition). Missing in screens entirely: military-service, military-deployment, military-authorization-request, health-shock choices, partnership, family-loss, business-formation (TownBusinessesPanel is a read view only), reelection-decision, office-succession.

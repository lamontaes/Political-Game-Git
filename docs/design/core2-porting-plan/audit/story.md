# ENGINE: story (story director, narrative threads, callbacks, childhood, journal, conversation)

Repo at origin/main (e6bc9f6c). 743 units: RULE 248 (5,758 lines), PLUMBING 232 (9,864), DATA 66, TYPE 169, DEAD 28. Read-only analysis.

## 1. SAMPLE AUDIT

src/presentation/world39-journal.ts:65 livedWorld39Sentence TOOL=RULE YOU=PLUMBING regex filter that scrubs old stored prose
src/simulation/situation-selection.ts:168 CROSS_PRESSURE_WEIGHT TOOL=RULE YOU=DATA tuning constant for parameter table
src/presentation/contextual-scenes.ts:74 CONTEXTUAL_SCENE_SUBJECTS TOOL=RULE YOU=PLUMBING registry list built from an object
src/simulation/situation-selection.ts:191 MONOTONY_PENALTY TOOL=RULE YOU=DATA tuning constant, flat design weight
src/presentation/conversation-subjects.ts:205 countWord TOOL=RULE YOU=PLUMBING number-to-word lookup, English-engine job
src/presentation/conversation-subjects.ts:220 sentenceCase TOOL=RULE YOU=PLUMBING string utility
src/presentation/conversation-subjects.ts:625 lifeTalkSubject TOOL=RULE YOU=PLUMBING UI adapter calling projectLifeConversation(world)
src/simulation/situation-selection.ts:358 averageStakesLoad TOOL=RULE YOU=RULE pure pacing math over recent stakes tiers
src/presentation/conversation-subjects.ts:1068 contextualSceneContract TOOL=RULE YOU=PLUMBING lookup of commit contract by family
src/presentation/life-talk-running.ts:68 isRunningIntent TOOL=RULE YOU=PLUMBING prefix check on intent key strings
src/simulation/story/threads.ts:365 importanceOf TOOL=RULE YOU=RULE tie + moments x (1 - 0.75 x fading)
src/presentation/world39-journal.ts:736 quoted TOOL=RULE YOU=PLUMBING quote-mark string helper
src/simulation/story/moments.ts:669 firstAtOrAfter TOOL=RULE YOU=PLUMBING binary search over history sequence cursor
src/presentation/player-conversation.ts:93 buildSubjectWirings TOOL=PLUMBING YOU=PLUMBING registry of subject room builders
src/simulation/character-history.ts:545 buildCharacterHistoryContextPerson TOOL=PLUMBING YOU=PLUMBING validates and writes a context person
src/simulation/story/moments.ts:369 eventPeople TOOL=PLUMBING YOU=PLUMBING reads old event participants
src/simulation/situation-selection.ts:28 adaptiveSelectionSeed TOOL=PLUMBING YOU=PLUMBING hashes world seed and setup priors
src/simulation/life-callbacks.ts:353 lifeCallbackTransitionHandler TOOL=PLUMBING YOU=PLUMBING due-item handler reading and writing World
src/simulation/character-history.ts:2955 SITUATIONS TOOL=PLUMBING YOU=DATA authored 19-situation childhood bank, slated for deletion
src/simulation/character-history.ts:1298 establishPreStartAdultHistory TOOL=PLUMBING YOU=PLUMBING seeded backstory generator writing events
src/simulation/character-history.ts:2972 lifeSituationCatalog TOOL=PLUMBING YOU=PLUMBING returns the bank array
src/simulation/story/threads.ts:623 assertStoryThreadIntegrity TOOL=PLUMBING YOU=PLUMBING validator over thread rows
src/simulation/character-history.ts:4638 assertNonEmpty TOOL=PLUMBING YOU=PLUMBING guard
src/presentation/conversation-continuity.ts:68 contextualSceneTag TOOL=PLUMBING YOU=PLUMBING finds active binding event
src/simulation/character-history.ts:4512 formativeEvent TOOL=PLUMBING YOU=PLUMBING builds event input with stored summary prose
src/presentation/conversation-subjects.ts:176 COUNT_WORDS TOOL=DATA YOU=DATA number words
src/simulation/episode-bank.ts:126 needsCommunityMember TOOL=DATA YOU=DATA requirement literal
src/presentation/journal-views.ts:112 MONTH_NAMES TOOL=DATA YOU=DATA month names
src/simulation/story/situations.ts:198 BAND_ORDER TOOL=DATA YOU=DATA ordered band list
src/presentation/childhood.ts:487 inChildhood TOOL=DEAD YOU=DEAD only childhood.test.ts calls it (grep confirmed)
src/presentation/journal-chapters.ts:93 titleFor TOOL=DEAD YOU=DEAD whole module imported only by tests (grep confirmed)
src/simulation/narrative-threads.ts:1026 threadPresence TOOL=DEAD YOU=DEAD only life-diagnostics.ts, itself test and scripts/life-report.ts only
agreement 20/32. Main misclassification: the tool calls any small "pure-helper" RULE (string, lookup, binary-search and tuning-constant units). They are utilities or parameters, not decisions. It was right on entangled readers and validators. "Unreferenced" DEAD also missed same-file use (titleFor is called by composeChapters, which is test-only).

## 2. MAP

- Moment intake (src/simulation/story/moments.ts, data/content/story-moment-kinds.json, 17 kinds, Holmes-Rahe weights). recordStoryMoments (809) reads every history record past a sequence cursor, in events, relationshipInteractions and five state stores. It scores salience = base x closeness x first-of-kind x trait x stakes. Writes history.storyMoments and storyIntakeMarks. Driven daily from advanceWorldMinutes (time-work.ts:1151). Readers: threads.ts, situation-scene.ts:220, observer-world.ts.
- Threads (story/threads.ts, story-threads.json): per-pair importance, tone, turn. Writes history.storyThreadStates, schedules fade due items (threads.ts:394, handler registry future-transitions.ts:10). Reader: observer-world.ts:625.
- Situation types and scene runner (story/situations.ts, situation-binding.ts, situation-types.json 32 types, story-moves.json 20 moves, presentation/situation-scene.ts). Casts roles from records and picks a move through evaluateDecision. Binds as a scene-binding event. Voiced by story-voice.ts, whose STORY_BANKS is empty, so no situation has a line today.
- Scene bindings and contextual scenes (scene-bindings.ts, contextual-scenes.ts, contextual-scene-families.ts, contextual-scene-producers.ts about 16 recordSceneBinding calls). One producer per family writes a "scene.contextual-bound" event; the conversation engine reads it back.
- Conversation engine (presentation: conversation-subjects, player-conversation, life-conversation, life-talk-*, scene-conversation, conversation-continuity/consequences/contact). Each turn writes an event, a claim, knowledge, relationship contact and optional commitments or aftermath. Progress is derived by replaying recorded intents (conversation-continuity.ts:199).
- Callbacks (life-callbacks.ts): decideAftermath (214) schedules a due item, and the handler (353) decides whether the counterpart raises it (598). Writes through applyCharacterHistoryPlan. Writers: adult-life.ts:448, conversation-consequences.ts:236.
- Childhood (presentation/childhood.ts, childhood-record.ts, character-history.ts authored bank). Caregiver, shared or own choice by age band; appendChildhoodEntry (childhood-record.ts:90) writes history.childhoodRecords from migration and the childhood scene.
- Episodes and narrative threads (episode-bank.ts 2,410 lines of authored copy, life-episodes.ts, narrative-threads.ts). Requirement checks over records; thread grouping rebuilt by scanning history on each call.
- Journal and narration (world39-journal.ts, journal-views.ts, life-narration.ts, journal-first-person.ts). Pure projections that read stored event.summary prose. journal-chapters.ts is test-only.
- Backstory generator (character-history.ts, contextual-character-history.ts): seeded generated childhood and adult history written as events with prose summaries.

## 3. STOPGAPS

Marker counts in these files and the data they import: SET BY HAND 1, GAME ASSUMPTION 0, NOT MODELED 0, PLACEHOLDER 3 (4 total). The markers are rare because stopgaps here are mostly unmarked "design weight" or "calibration" values.

- character-history.ts:789 PLACEHOLDER(wave2): fictional season weights for generated events.
- contextual-scene-producers.ts:104 SET BY HAND: how long a town-hall question stays open.
- life-talk-running.ts:43 PLACEHOLDER, NOT REVIEWED: interim reply copy for the running-for-office talk.
- life-talk-topics.ts:36 PLACEHOLDER, NOT RESEARCH: what counts as news and how a listener answers.
  Unmarked, equivalent:
- life-callbacks.ts:163 fixed delays 96/187/251/314 days for obligation/grievance/goodwill/standing.
- life-callbacks.ts:82 RETURN_SUMMARY, hand-written prose inside simulation.
- situation-selection.ts:168-200 flat design weights (1.4, 1, 0.35, 0.7, 1.2, 0.45).
- story-threads.json and story-moment-kinds.json calibration block (ties 0.5/0.35/0.2/0.3, fading 0.75, first-of-kind 1.5, trait tilt 0.25, cap 0.35); sourced to the owner's design, labeled calibration.
- formative-play passes relevance 0.5 to every childhood situation (story-director.md part 4).
- character-history.ts: one six-event childhood template for every adult player.
  Randomness: no dice on actor outcomes. Seeded draws exist in generation and wording. character-history.ts:1274/1331/1616/3442/4611 (identities, schools, birth dates, peer offset via peerDraw.next()<0.5, a pick among real options). contextual-character-history.ts:118 picks a shared-event wording. life-episodes.ts:2065 picks episode detail alternatives by seed (wording). contextual-scenes.ts:432 and conversation-subjects.ts:892 pick scene line variants by seed (wording). situation-selection.ts:234 uses a sha256 digest only to break exact score ties among offers. None decides what a person does. State, city or GEOID names in logic: none found (grep of all 56 names).

## 4. KEEPERS

1. story/moments.ts:695 closenessFactor + 737 traitFactor + 317/327 freedomStakes/moneyStakes + salience product (about 880). Inputs: base weight row, standing bands (warmth, commitment), trait readings with act pulls, sentence months, recorded pay. Entangled (reads World for standing, pay, kinship). Would take plain numbers and two read callbacks.
2. moments.ts:199-250 rowForAge/relationOf/weightOf: age-band row choice, relation of two people. Needs birth dates and a kin lookup; port as is.
3. threads.ts:289 tieBetween, 322 readPair, 340 tone, 350 turnFor, 365 importanceOf. Needs the five-line standing, kin tie, shared-home flag, fading. turnFor reads World only for death; pass a flag.
4. situation-selection.ts:206 rankSituations + 339 pacingPenaltyFor + 358 averageStakesLoad. Pure scoring with injected candidates and recent tiers. No World except the seed.
5. story/situations.ts:236 moveConsiderations (role wants + standing pulls -> decision considerations) and 302 chooseSituationMove. Needs role wants, five-line standing, trait act pulls.
6. life-callbacks.ts:214 decideAftermath, 598 counterpartRaisesIt, 277 stillConnected. Rules: does anything come of a choice, and does the other person raise it. Entangled; counterpartRaisesIt scans all relationshipInteractions (whole-array filter). Port to per-pair interaction index.
7. presentation/childhood.ts:90-130 agency bands (0-7 caregiver, 8-12 shared, 13-17 own) and 372 childhoodChoice (caregiver decides through traits). Needs age, caregiver traits.
8. life-episodes.ts:1782 checkRequirement and 1482 eligibleEpisodeBeats: requirement checks returning causal inputs with record ids. Large, entangled with History queries.
9. narrative-threads.ts:864 thread standing (pressing/dormant/settled, 400-day dormancy at 164). Superseded by threads.ts importance; keep only the standing rule.
10. life-choice-evidence.ts: turns played choices into trait evidence (about 5x a setup answer). Needs decisions list.
11. life-talk-topics.ts:91 tellableTopics: what the player can tell a listener (recent scenes the listener missed). Needs knowledge reads; maps directly to knows().
12. Data to keep: story-moment-kinds.json, situation-types.json, story-moves.json, story-threads.json (all already data).

## 5. CORE2 MODULE INPUTS

State owned (Maps by id, plus indexes): moments (id -> person, date, kind, salience, factors, counterparts, sourceEventId) with momentsByPerson and momentsByPair; threads keyed by pair "a|b" holding importance, fading, lines, turn, lastContact, with threadsByPerson and threadsByOther; sceneBindings (id -> type, cast, place, date, moves chosen) with bindingsByPerson; childhoodRecord entries for the player circle only. Not stored: the intake cursor (events replace it), the coverage log (developer only), prose.
Events consumed in onEvent (kind -> moment kind): household move/migration, left home, death learned (access "told"), married, couple formed/ended, divorced, family member added (birth), sentenced/held, meeting proposed, future preparation, enrollment started/completed, work started, work status laid off/business closed, organization joined, and a relationship-interaction event (kind, change, significance). The moment table keys on these kinds, so core2 kinds should carry the same facts as today's event types, tags and roles.
Knowledge reads: knows(person, factKey) for tellable topics, for who has heard a death or news, and for counterpartRaisesIt (does the other person know the matter). Public-record or news flags decide whose journal shows it.
Acts offered: the situation moves as act definitions. Actor = the person in the role, target = the counterpart, prerequisite = a bound situation with that role filled and the move open for the role, effect = a relationship interaction (kind, change, significance) plus optional undertaking/callback. 20 moves map to 1-3 of the 20 act kinds each. Also `raise-it` / `let-it-lie` (callback return) and the caregiver's pick for a child. No act is offered to officials.
Effects: relationship interaction, undertaking, scheduled callback (requestCallback), thread turn. Events emitted: situation-opened and callback-returned (circle), thread-turned (observer only), moment-scored (observer only; not public). Nothing public record or news.
Calendar and tier: daily for the player circle and focus places (matches storyFocus, moments.ts:775), coarser elsewhere. Due dates: fade checks per pair, callback delays 96/187/251/314 days, school stage end dates (last-day scene), birthdays. No election days or sessions.
Data reused: the four story JSONs, data/english/story-voice.json, act-kinds.json, the trait act table.

## 6. DEPENDENCIES AND RISKS

Needs first: life/people and households (kinship, partnerships), relationships and standing (five lines, absence), knowledge, trait readings and act pulls, decisions, education, work and migration events. Cannot start before core2 emits typed events for those.
Risks:

1. Intake is a history-sequence cursor (moments.ts:166, 809, newRecords). core2 has no global sequence; replace with onEvent. Ordering and de-duplication ("one change, one moment", sameAs) depend on cross-store sequences.
2. Prose is stored in the old core (event.summary from formativeEvent 4512, RETURN_SUMMARY, authored childhood bank, episode-bank.ts 2,410 lines). The journal (world39-journal.ts) reads that text. Core2 emits no prose, so the journal and callbacks need typed events and the English engine.
3. Many consumers whole-scan history (narrative-threads personThreads 241, counterpartRaisesIt, scene-conversation.ts:106 finds events with .find over history). Each needs an index.
4. Save-format coupling: scene bindings are events with tag strings (scene-bindings.ts:22-24), conversation progress is replayed from recorded intents, childhood record entries cite record ids. All have to be redesigned as state.
5. 16 contextual-scene producers in presentation write world state (recordSceneBinding) inside UI-layer code; they have to become module offers and events.
6. The 19-situation childhood bank and the six-event backstory generator are scheduled for deletion; core2 deep-past.ts is the replacement. Do not port them.

## 7. LIFE-REPLAY STEPS

Story is a consumer, so it supplies no mechanism, but it must score and surface each one. Today's 17 moment kinds cover: residence-move (moved-home), education-enrollment and completion (school-started/finished), family-loss (death-learned), employment (job-started/lost), partnership (married, started-dating, separated), cause-participation (group-joined). It also gives conversations after those events (favor, reach-out, advice) and callbacks.
Missing kinds: candidacy, election-result, office-service, office-succession, reelection-decision, legislative-proposal, law-signature, public-appointment, military-service, military-deployment, military-authorization-request, chamber-leadership, health-shock, business-formation. There is no row in story-moment-kinds.json for any of them, no weight row chosen for them, no situation type except election-night, and no war design (owner answer 4). Health: the absence reader says illness is not represented (relationship-absence.ts:55). The "role change" resurfacing rule (design part 5) is unbuilt.

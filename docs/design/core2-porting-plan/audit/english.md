# ENGINE: english (English engine as a consumer of typed core events)

Repo at origin/main (e6bc9f6c). 289 units: RULE 76 (1,405 lines), PLUMBING 41 (1,527), DATA 63 (3,237), TYPE 78, DEAD 31. 26 .ts files in src/presentation plus 30 files (624 KB) in data/english. Read-only analysis.

## 1. SAMPLE AUDIT

src/presentation/english-composition.ts:185 linePartsOf TOOL=RULE YOU=PLUMBING parses a tag off stored history events
src/presentation/speech-registers.ts:108 BRIEFINGS TOOL=RULE YOU=DATA citation string for research row
src/presentation/speech-registers.ts:106 MEETINGBANK TOOL=RULE YOU=DATA citation string for research row
src/presentation/english-grammar.ts:191 PERCENT_SIGN TOOL=RULE YOU=RULE regex of the AP percent style rule
src/presentation/bank-english.ts:67 composeFromBank TOOL=RULE YOU=RULE pure part pick: move, slots filled, grades
src/presentation/legislative-motif-english.ts:946 motifEnglishPacket TOOL=RULE YOU=PLUMBING adapter that packages inputs into a packet
src/presentation/legal-record-english.ts:19 countWord TOOL=RULE YOU=PLUMBING tiny number-word lookup
src/presentation/english-composition.ts:356 eases TOOL=RULE YOU=RULE tension reading decides softened opener
src/presentation/english-grammar.ts:40 capitalize TOOL=RULE YOU=PLUMBING string utility
src/presentation/speech-registers.ts:115 REGISTER_CARDS TOOL=RULE YOU=DATA research-measured register cards, 181 lines of literals
src/presentation/english-composition.ts:450 sentenceStart TOOL=RULE YOU=PLUMBING capitalizes first character
src/presentation/legislative-motif-english.ts:982 composeMotifEnglish TOOL=PLUMBING YOU=RULE pure fallback order over banks; takes no World
src/presentation/small-talk-english.ts:321 recentPartKeys TOOL=PLUMBING YOU=PLUMBING reads tags of stored history events
src/presentation/small-talk-english.ts:424 matterUninformedLine TOOL=PLUMBING YOU=PLUMBING builds a packet from World reads
src/presentation/grounded-english.ts:292 effectiveKnowledgeRequirements TOOL=PLUMBING YOU=RULE decides who must know each fact; takes a packet
src/presentation/legislative-dialogue-motifs.ts:183 engineLine TOOL=PLUMBING YOU=PLUMBING wraps composedLine plus nameOnce
src/presentation/press-english.ts:284 composePressLine TOOL=PLUMBING YOU=RULE refuses a fact the speaker does not know
src/presentation/speech-registers.ts:20 SPEECH_REGISTERS TOOL=DATA YOU=DATA register names
src/presentation/job-listings-english.ts:11 EMPTY_JOB_LISTINGS_BANK TOOL=DATA YOU=DATA authored bank
src/presentation/english-grammar.ts:81 TITLE_WORDS TOOL=DATA YOU=DATA office title word list
src/presentation/small-talk-english.ts:570 LIVED_OUTCOME_VIEW TOOL=DATA YOU=DATA authored bank
src/presentation/life-reply-english.ts:17 CORES TOOL=DATA YOU=DATA reply sentences keyed by name
src/presentation/subject-reply-english.ts:613 SCHOOL_SPLIT_UNDECIDED TOOL=DATA YOU=DATA authored bank
src/presentation/subject-reply-english.ts:1314 NEIGHBORHOOD_UNDECIDED TOOL=DATA YOU=DATA authored bank
src/presentation/subject-reply-english.ts:222 SCHOOL_OFFER TOOL=DATA YOU=DATA authored bank
src/presentation/subject-reply-english.ts:1455 SCHOOL_OPEN TOOL=DATA YOU=DATA opening bank call, one sentence
src/presentation/work-start-journal-english.ts:159 grammaticalWorkRolePhrase TOOL=DEAD YOU=DEAD module imported only by its test (grep confirmed)
src/presentation/election-speech-english.ts:190 ELECTION_SPEECH_BANKS TOOL=DEAD YOU=DEAD referenced nowhere
src/presentation/legislative-cost-objection-english.ts:141 COST_OBJECTION_BANKS TOOL=DEAD YOU=DEAD only its test uses it
src/presentation/english-grammar.ts:44 personWords TOOL=DEAD YOU=DEAD only english-grammar.test.ts calls it
agreement 19/30. Main misclassification: the tool calls tiny string helpers and citation constants RULE, and it calls pure packet-taking functions PLUMBING (composeMotifEnglish, effectiveKnowledgeRequirements, composePressLine). "World-typed" is its plumbing signal; here several pure rules take a packet and are not entangled. The DATA calls were right: about 3,200 lines of authored banks live in .ts.

## 2. MAP

- Grounded realizer (grounded-english.ts, 319 lines, no World). GroundedEnglishPacket {surface, momentKey, worldSeed, bankVersion, stage, facts{key: text+sourceRecordIds}, speaker, viewer (traits), knowledge[]}. renderGroundedEnglish (112) refuses a variant whose fact is missing or whose holder does not know it (packetProblems 192, effectiveKnowledgeRequirements 292). Picks a variant by stableHash(seed:momentKey:bank:version) mod total weight (line 140).
- Line composer (english-composition.ts, no World): opener/core/reason/closer parts, 24 speech acts (SPEECH_ACTS; seven added for the story director). composeGroundedLine (231) takes relationship readings, mood, register, recentPartKeys, owner grades. Writes nothing.
- Part banks: data/english/parts/*.json (15 mined banks: hearing, meeting, minutes, press, judges, legislation, tribute, and others), bank-english.ts composeFromBank (67) and lines (166), reading World for local meetings and officers. About 3,200 lines of further authored banks in .ts (subject-reply-english 1,466 lines, small-talk-english 906, life-reply-english, legislative-motif-english 1,042).
- Owner grades: english-grades.ts, data/english/part-grades.json (batch-1, batch-2, per part key). A part graded BAD or FIX and never GOOD is held back (heldByGrades 50). Driven by scripts/dialogue-batch/apply-grades.ts.
- Grammar and registers: english-grammar.ts (pronouns from the person record, AP money/percent/date, office phrases, tense), speech-registers.ts (register cards with measured checks; checks are totals for a watched world, not dice).
- Story voice: story-voice.ts voiceStoryLine; data/english/story-voice.json fits. STORY_BANKS is empty ({}), so situations get no lines today.
- Surfaces and adapters that read World to build packets: scene-conversation.ts:96 playedSceneEnglishPacket, small-talk-english.ts, press-english.ts pressAnswerPacket, life-so-far-english, speech-remembered-english, talk-choice-english, everyday-english, person-card-english, election-speech-english.
- Reply meaning (reply-meaning.ts:172 evaluateReplyMeaning): the speaker decides agree/different arrangement/decline/undecided through evaluateDecision from five-line standing, appraisals and temperament; then tone (76 standingTone) picks wording. This is an actor decision living in the English layer.
  Writers: none to the World. It does write line-part keys as tags onto conversation events (life-conversation.ts:785, linePartsTag) for recency.

## 3. STOPGAPS

Markers (SET BY HAND, GAME ASSUMPTION, NOT MODELED, PLACEHOLDER) in these files and data/english: 0 of each. Closest equivalents:

- small-talk-english.ts:463 and :568 "not yet reviewed": two authored banks awaiting editorial review.
- speech-registers.ts: REGISTER_CARDS hold counts from corpora (Pennsylvania journal, MeetingBank, briefings); marked "patterns only".
- english-composition.ts:217 SLOW_OPENER_BANK and life-reply-english CORES: authored copy, graded in batches but not all graded.
- story-voice.ts:50 STORY_BANKS = {}: the story director's 7 new acts have no banks.
- coverage.json lists only conversation, press, judges, news, journal, hearing, legislation, meeting, winning-and-losing, minutes, notices; journal and news cells are all "everyday/self" only.
  Randomness: no dice on outcomes. Hash picks decide wording only: grounded-english.ts:140 (weighted by variant weight), bank-english.ts:87, story-voice.ts:89, talk-choice-english.ts:137. They are keyed to momentKey, so saves read the same. Variant weights ("relative frequency") are fixed numbers in data. State or GEOID names in logic: none found; election-speech-english.ts:238 has only a comment example.

## 4. KEEPERS

1. grounded-english.ts:112 renderGroundedEnglish and 192 packetProblems / 292 effectiveKnowledgeRequirements. The key rule: no sentence names a fact the holder does not know or that has no source record. Input: a packet. Not entangled; port as is.
2. english-composition.ts:231 composeGroundedLine, 356 eases, 365 conditionProblems: parts, relationship and mood conditions, recency tiers. Needs bank, packet, relationship readings, mood key. Not entangled.
3. english-grammar.ts (whole file): pronouns, tense, AP money/percent/date, office phrases, nameOnce. Needs person pronoun and sex fields; takes Person today, would take a small view.
4. english-grades.ts + part-grades.json + heldByGrades (50): owner grade ledger. Pure data read.
5. bank-english.ts:67 composeFromBank: move + slots + hash pick. Replace the hash with an event id; keep the fit rule.
6. speech-registers.ts:115 register cards and register selection rules. Use as watched-world checks, never to decide.
7. reply-meaning.ts:172 evaluateReplyMeaning, :76 standingTone. Entangled with World (decisions, standing, appraisals). Belongs in core2 as an act (decide a reply meaning), leaving the engine only to word it.
8. press-english.ts:156 pressAnswerPacket / :284 composePressLine: packet-from-facts pattern including "speaker must know each fact".
9. legislative-motif-english.ts:982 composeMotifEnglish: banks by voice with a shared fallback. Pure. 1,042 lines, mostly authored copy.
10. data/english/parts/_.json, story-voice.json, counts/_.json, exchanges/*.json, coverage.json: keep as data.

## 5. CORE2 MODULE INPUTS

The English engine owns no core state. It is a one-way tap: core emits typed events and core never imports presentation or holds prose. Engine-side state only: a render cache keyed by (eventId, surface, bankVersion), a recent-part list per speaker/listener pair (replaces the "english.line-parts.v1" tag on events), and the grade ledger.
Subscription: register a narrator per event kind, called with a retained-log record (circle, public-record, news, observer; core brief) for passive lines (journal, news, notices), and a pull call render(eventId, viewerId, surface) for dialogue and menus. Calls are pure reads against the CoreAPI read surface and never advance time.
Event/fact packet the engine needs from core2:

- Identity: eventId, kind, date, placeId, personIds with a role per person (speaker, listener, subject, witness), source (act id or system), publicRecord, news flags. The momentKey becomes eventId plus a per-line index (today it uses history.nextSequence and JSON of currentMoment, scene-conversation.ts:134, so wording changes whenever anything is appended).
- Typed facts, not strings: ids, minor-unit money, ISO dates, counts, enum keys (office kind, bill designation id, vote result). The engine formats with grammar. Today callers hand over pre-rendered text (`facts: {matter: {text}}`), and each fact also carries sourceRecordIds, which core2 must provide as the event id plus any record ids.
- Knowledge: knows(person, factKey) with access (self, perceived, told, public) and sourceId, so the "speaker knows it" rule has its basis. Current rows are {personId, factKey, sourceRecordIds}.
- Person view: given name, family name, pronouns, age/stage, role title, appearance not needed.
- Relationship readings: the five lines (warmth, trust, respect, commitment, tension) with band, adverse flag, and basis ids; plus how the speaker knows the listener (family, friend, stranger) for the "how you know" lines.
- Mood: a recorded mood key with a source id (core2 emotion.ts).
- Traits: voice cues only (tendency strength) with source ids; never as facts.
- Chosen meaning: the speech act (24 acts), and for replies, the decided meaning, so decisions stay in core.
- Register hint: setting (floor, committee, table) from place/office context.
  Missing/estimated values: the engine returns missing-context and no line, never filler; core2 must mark ESTIMATED values in the fact so wording can hedge.
  Acts: none. Events emitted: none. Calendar: none. Tier: runs only for what the player can see.
  Data reused: all of data/english (parts, counts, exchanges, grades, coverage, story-voice, talk-choice-fits).

## 6. DEPENDENCIES AND RISKS

Needs first: core2 people/relationships/knowledge/emotion, and each engine's typed events (elections, legislation, courts, press) to be voiced. The story engine's situation packets need the banks.
Risks:

1. Prose in old events: the old core stores event.summary and tags; the English layer reads stored text in places (journal). core2 must carry facts only, so every journal and news line must be re-voiced from the typed event.
2. Pre-rendered facts and the momentKey tied to nextSequence break save-stability and "words follow facts"; both need redesign (event-id-based key).
3. About 3,200 lines of authored banks in .ts (subject-reply-english, small-talk-english, life-reply CORES, motif banks) have to move to data/english JSON with part keys preserved so the grade ledger still lines up.
4. Decision logic in the presentation layer (reply-meaning evaluateReplyMeaning, subject-reply tone selection) must move into core2 acts; otherwise core does not own what a person means.
5. bank-english reads local-government and officer tables of the old World (local-council-meetings, local-government-seats). Needs core2 organization/office queries.
6. Coverage is thin: journal and news cells are everyday/self only; most mechanisms have no voiced event, and the story banks are empty.

## 7. LIFE-REPLAY STEPS

The English engine supplies no mechanism; it voices the result of every one. Coverage today, from data/english/coverage.json and parts: candidacy and election-result (winning-losing, victory-concession, stump-remarks, election-speech-english), legislative-proposal and law-signature (legislation, meeting, minutes, hearing, legislative-motif), office-service (meeting, press), family-loss (tribute, conversation). Journal and news lines exist only for everyday/self at several ages.
Lacking: journal or news wording for residence-move, education-enrollment/completion, employment, partnership, cause-participation, public-appointment, office-succession, reelection-decision, chamber-leadership, health-shock, business-formation; and any wording for military-service, military-deployment and military-authorization-request. The story voice banks are empty.

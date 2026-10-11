# Press engine: P11 porting findings

Scope: `src/simulation/press/*` (36 non-test files), `press-interviews.ts`, `press-interview-producers.ts`, `press-reach.ts`, `public-information*.ts`, `speech-retelling.ts`, `neighbor-news.ts`, `national-mood.ts`, `living-world/news-habits.ts`. Tool totals for the 745 units: PLUMBING 9,646 lines, RULE 4,342, TYPE 1,265, DATA 971, DEAD 292. Only 52 RULE units (3,037 lines) are entangled with World.

## 1. SAMPLE AUDIT

- press/law-effect-news.ts:746 lawNewsReaders TOOL=PLUMBING YOU=PLUMBING scans all people and history to pick readers
- public-information-integrity.ts:429 TAX_POLICY_BY_EVENT_ID TOOL=PLUMBING YOU=PLUMBING history-row lookup index
- press/matters.ts:1438 reportedCandidatePayments TOOL=PLUMBING YOU=PLUMBING filters history events, joins flow ids
- press/story-voice.ts:198 headlineFor TOOL=PLUMBING YOU=PLUMBING wording from event summary; belongs to English engine
- press-interviews.ts:1177 requireEvent TOOL=PLUMBING YOU=PLUMBING throws unless event found in history
- speech-retelling.ts:383 speechRetellingHandler TOOL=PLUMBING YOU=PLUMBING time-handler wrapper, reschedules itself
- press/editorial.ts:142 releases TOOL=PLUMBING YOU=PLUMBING reads world.macroEconomy.releases
- press-interview-producers.ts:957 producePressAdviserFeedback TOOL=PLUMBING YOU=PLUMBING lookup chain, writes knowledge and feedback record
- press/desk.ts:1204 shareWithSiblings TOOL=PLUMBING YOU=PLUMBING copies a story to sibling outlets via writers
- press/finding-consequences.ts:44 applyFindingConsequences TOOL=PLUMBING YOU=PLUMBING dispatches to injected writers per respondent
- press/finding-consequences.ts:117 socialConsequence TOOL=PLUMBING YOU=PLUMBING who-learns rule is real but buried in writes
- press/desk.ts:530 recordSubjectResponse TOOL=PLUMBING YOU=PLUMBING validates, writes event, disposition, interaction
- public-information-integrity.ts:23 CIVIC_PUBLICATION_OUTLET_KEY TOOL=PLUMBING YOU=DATA a fixed outlet-name constant
- press/ownership.ts:116 outletOwner TOOL=PLUMBING YOU=PLUMBING record lookup
- press/outlets.ts:686 ensureOutlet TOOL=PLUMBING YOU=PLUMBING creates org and reporters with seeded names
- press/story-work.ts:185 storyWorkItem TOOL=PLUMBING YOU=PLUMBING linear scan of workItems
- press/law-effect-news.ts:74 LAW_EFFECT_STEP_TAG TOOL=RULE YOU=PLUMBING tag-string prefix, no logic
- press/outlets.ts:387 DAILY_TOWN_RANK TOOL=RULE YOU=DATA tuning parameter (rank 1,000), ESTIMATED
- press/story-voice.ts:108 COUNTED_SUBJECT TOOL=RULE YOU=PLUMBING regex that parses summary prose
- press/ownership.ts:228 weightedPick TOOL=RULE YOU=RULE pure weighted draw; founding-time only, seeded
- press/law-effect-news.ts:571 LOOK_BACK_WINDOW_DAYS TOOL=RULE YOU=DATA HAND-SET 30-day tuning parameter
- press/procedures.ts:101 FEC TOOL=RULE YOU=DATA research table of steps, day gaps, sources
- press/editorial.ts:177 economyContext TOOL=RULE YOU=PLUMBING builds a prose sentence from World releases
- press-interviews.ts:50 MODE_PREFIX TOOL=RULE YOU=PLUMBING tag-string prefix
- press/desk.ts:887 storyMaterial TOOL=RULE YOU=RULE corroboration test from sources and public basis
- press/desk.ts:2056 beatForEventType TOOL=RULE YOU=RULE event-type prefix to beat mapping, pure
- press/findings.ts:19 ADVERSE_PUBLIC_OUTCOMES TOOL=DATA YOU=DATA list of outcomes that count
- press/records.ts:70 LEAD_ROUTES TOOL=DATA YOU=DATA vocabulary enum
- press/records.ts:155 MISCONDUCT_FAMILY_ROWS TOOL=DATA YOU=DATA offense families with statute references
- press-reach.ts:75 projectPressReachSnapshot TOOL=DEAD YOU=DEAD only press-reach tests call it
- press/procedures.ts:652 procedureDefinition TOOL=DEAD YOU=DEAD only state-ethics.test.ts calls it
- press-reach.ts:142 seekCivicPressContact TOOL=DEAD YOU=DEAD only two tests call it (barrel re-export in index.ts:297)

agreement 24/32. Main misclassification: the tool calls string tag prefixes, regexes and hand-set tuning constants RULE because they are "pure" (6 of 8 misses). It also calls a research step table (FEC) and a World-reading prose sentence builder (economyContext) RULE. For core2, a `RULE` that reads `world.macroEconomy` and returns English is English-engine work. The DEAD calls were all correct. The tool does not mark that `press-reach.ts` is also read by `presentation/contextual-scene-producers.ts:73` (`currentJournalists`, live), so the file is only partly dead.

## 2. MAP

- **Outlets and reporters** (`press/outlets.ts`, `store.ts`, `records.ts`). Writes pressRecords kinds `media-outlet`, `reporter-role`, plus an organization and hired journalists. Seed pack: three national products; a state outlet when state politics is first exposed; a local outlet by town size (`localProfileFor` :391). Driven by `ensurePressOpening` (`transitions.ts:~90`, new life only) and `ensurePress*Coverage`. Readers: `news-habits.ts`, `contextual-scene-producers.ts`.
- **Ownership and books** (`ownership.ts`, `ownership-packs.ts`, `ownership-pack-default.ts`, `media-purchase-payment.ts`). Writes `media-owner`, `outlet-ownership`, `owner-directive`; moves cash via financial writers. Driven by the owner-review due item (`pressOwnerReviewHandler` :316) on each owner's cadence. Decisions: cut staff from saved payroll vs cash (:691), acquire an outlet (:816, needs `lastQuarterNet<0` or debt, cash >= price), share stories (`sharingSiblings` :137). Player acts: `outletPurchaseTerms` :1060, `purchaseOutlet` :1135 via `PressDeskPanel.tsx:633`.
- **News desk** (`desk.ts`). Weekly sweep (`pressDeskSweepHandler` :1536, 7-day due item) reads events newer than a sequence frontier, judges `outletCovers`/`newsworthiness`, writes `story-lead` and `story-disposition` records, assigns a reporter (`assignStory` :295, `chooseReporter` :2094), runs response windows and the editorial step (`pressStoryStepHandler` :679, `editorialDecision` :952), publishes via `publishPublicEvent`, copies to sibling outlets, issues corrections. Writes history.events, publications, knowledge, workItems, decisionTraces, futureDueItems. Reader of the whole world: it consumes every other engine's public events.
- **Story work and exposure** (`story-work.ts`, `story-exposure.ts`, `read-publication.ts`, `law-effect-news.ts`). Reporter effort in minutes against the job's weekly hours. Readers learn a story (`recordProfessionalReaders` desk.ts:1302; a local outlet reaches every resident of its place). A story about a law's effect becomes a `news` law exposure (writes law-exposure, official views). `law-effect-news.ts` turns law exposures and money-flow term changes into weekly town records and 1-year anniversary stories.
- **Sources, interviews, subject response** (`sources.ts`, `press-interviews.ts`, `press-interview-producers.ts`, `responses.ts`, `desk.ts:443-640`). Player or NPC negotiates ground rules, discloses, answers a request, pitches an interview, prepares with an adviser. The reporter's accept/defer/decline goes through `evaluateDecision` with trait considerations (producers :480). Writes events, activities, workItems, claims, knowledge. Driven by player UI (`PressWorkspace.tsx`, `PressDeskPanel.tsx`, `presentation/press-disclosure.ts`) and by NPC producer calls.
- **Matters, proceedings, findings** (`matters.ts`, `procedures.ts`, `state-ethics*.ts`, `generated-state-oversight.ts`, `findings.ts`, `finding-consequences.ts`, `claim-route.ts`, `caught-lying.ts`, `spending-reports.ts`). Misconduct act -> record -> bookkeeper decides to report (:996) or a rival files (:1103) -> proceeding step machine (`advanceProceeding` :757, per-body step tables with `authored` or `rule` day gaps) -> public finding -> support loss (`campaign-support.ts:327`), restitution (`governing/finding-restitution.ts:169`), referral (`justice/finding-referral.ts:13`), social reactions (`responses.ts:160`). Driven by a 30-day ledger-review due item, the proceeding-step due item, and the weekly handler. Readers: `record-in-office.ts:116`, `campaign-opponents.ts:1156`, `campaign-life-activities.ts:1408`, `moguls.ts:566,1031`.
- **Inquiries and subpoenas** (`inquiries.ts`, `inquiry-subpoena-rules.ts`, `player-misconduct-situations.ts`). Written but unreferenced from production. The only live subpoena-adjacent piece is the data file `data/research/legislative-procedure/inquiry-subpoena-rules.json`.
- **Public information** (`public-information*.ts`). Publication rows, corrections, digest for the front page. Mutation boundary is `publishPublicEvent` :91; `-integrity` validates sources.
- **Word of mouth** (`neighbor-news.ts`, `speech-retelling.ts`). `peopleTiedTo` (:58) reads household, kin and warm ties; `tellPeopleOf` writes event knowledge; callers are `people-family.ts:483`, `migration/relocate.ts:563`, `town-labor-market.ts:194`. Speech retelling is a monthly due item; memory strength from salience and formative age.
- **National mood and habits** (`national-mood.ts`, `news-habits.ts`). Mood: change in the president's recorded support among adults since inauguration (midterm years only), read by `presidential-turnover.ts:733`, `state-legislature-turnover.ts:742`. Habits: which outlets a person follows (scope, home state, offices) and whether they follow closely; read by the desk, `official-views.ts:575`, and the front page.

## 3. STOPGAPS

Counts in the engine's files (no data/ JSON imports carry markers): SET BY HAND 0, PLACEHOLDER 0, GAME ASSUMPTION 2, NOT MODELED 3. The engine's real label vocabulary is different: HAND-SET 6, RECORDED GAME RULE/PROFILE 7+, ESTIMATED FROM 4, "not simulated" 4, "authored" intervals 42, provisional 3. Most important:

1. speech-retelling.ts:52 GAME ASSUMPTION: 10-year memory decay is a placeholder; :161 playable lives start at five.
2. ownership.ts:60 NOT MODELED: acquisitions and other directives use pack likelihoods; owner events carry the `press.` prefix so owners' decisions are never news.
3. ownership.ts:131 NOT MODELED: editors and staff resisting an order; sibling pickup beyond relevance; no lag.
4. ownership.ts:1054 NOT MODELED: asking price is a flat tier price, not the books.
5. ownership-pack-default.ts:44-86 `likelihoodPerReview` (0.05 to 0.3) is stored and validated but no longer read; `askingPriceDollars` are game prices.
6. findings.ts:37 RECORDED GAME RULE: 300/150 bp support loss, 90-point later penalty, 6-year memory; research explicitly does not validate them.
7. desk.ts:108 `PRESS_DESK_INTERVALS` (7-day sweep, 2-day response, 1 routine item a week), all provisional.
8. desk.ts:1929 newsworthiness weights (matter 4, named people 2, scale n, resident 2) are hand-set integers.
9. outlets.ts:165-187 every state has the same standard statehouse newsroom; territories and DC have fictional mastheads; no sourced place rows.
10. generated-state-oversight.ts:24,48 HAND-SET: every un-researched state follows the federal FEC calendar (answer 60, inquiry 90 days).
11. procedures.ts:383-400: 23 states' step gaps are all `authored`, none `rule`.
12. law-effect-news.ts:61-65,561,570 HAND-SET importance, one record per law/town/step, anniversary at one year, 30-day look-back.
13. inquiries.ts:32 baseline scope is public records and voluntary interviews; no compulsory power assumed.
14. story-effort-data.ts: effort minutes and experience multipliers are "CTO-admitted estimates".
15. matters.ts:85-86 `LEDGER_REVIEW_DAYS` 30, 1114 report interval 30 are authored, not filing calendars.
16. spending-reports.ts:14 comparison set is the game's own committees; not a filing calendar.
17. ownership.ts:~700 `reduceNewsroomStaff` uses `shareOfPositions` 0.34/0.15 from the pack.
18. responses.ts:262 role-by-role option leanings (staff `maintain-support`, party `request-explanation`) are hand-set considerations.
19. national-mood.ts:200 mood is only the president's party and only in midterm years (`year % 2 ... % 4`).
20. speech-retelling.ts:73-90 salience uses a two-mark step and a majority cutoff (`cheered*2 > total`): hard thresholds against the sliding-scales rule.

Seeded randomness: no dice on an actor's outcome. Seeded uses are identity creation: outlets.ts:463,579,627,695 masthead names (`rng.pick`); outlets.ts:834-849 reporter `persistence`/`conflict` temperament picked from a range set by editorial standard; ownership.ts:201-204,255 `weightedPick` founding owner and owner name. Seven `randomness: "close-choices"` decision calls (desk.ts:397,841; matters.ts:917,1051,1648,1753; responses.ts:286) delegate near-ties to the shared decision engine's seeded tie-break, which the no-dice rule forbids for real actors. Place names in logic: `procedures.ts:214-216` Kentucky Legislative Ethics Commission definition; `state-ethics.ts:~30` `"US-KY"` entry; `generated-state-oversight.ts:83-130` 20+ state keys to commission names (per-place table in .ts); `outlets.ts:324-360` Puerto Rico, DC and territory profiles; `outlets.ts:392` uses a GEOID to find population (via data lookup, not a literal). `state-ethics-bodies.ts` is a 24-row per-state table in .ts.

## 4. KEEPERS

1. desk.ts:1808 `outletCovers` and :1929 `newsworthiness`: scope, jurisdiction, hometown, federal-office and scale rules, plus integer reasons. Inputs: outlet (scope, jurisdictions, beats), event (type, jurisdiction, tags, scale), residents of subjects. Entangled via `residentSubjects`, `stateOfJurisdiction`; take a plain event view and a resident lookup.
2. desk.ts:887 `storyMaterial` and :952 editorialDecision core: corroboration (named source, 2 sources, or 1 plus document) and outlet standard (gentler/realistic/tougher) choosing publish/narrow/hold/decline. Inputs: contributions, agreements, public basis count, standard. Currently reads press records; pass counts instead.
3. desk.ts:2094 `chooseReporter` ordering (tipped, beat, prior contact, familiarity, load) and desk.ts:2056 `beatForEventType`. Inputs: roles, beats, contact counts, reserved minutes.
4. story-work.ts:68,121 `reporterWorkBudget` and `storyEffortEstimate`: minutes demanded vs weekly hours; experience bands. Inputs: weekly hours range, reserved minutes, journalism years. Entangled via work-history reads; take years of service.
5. outlets.ts:391 `localProfileFor` with `DAILY_TOWN_RANK`: outlet kind by place population rank. Needs population rank; no World.
6. procedures.ts:101-640 step machines, `advanceProceeding` :757: complaint to notice to answer to determination to finding; each step has days and `rule`/`authored` basis and confidentiality. Port as data rows plus one small interpreter. `institutionHoldsSupport` :686 gates a step on authority.
7. findings.ts:46 `RECORDED_FINDING_EFFECTS` and :70 `publicAdverseFindingsAgainst`: standing loss by outcome, memory window. Pure; needs list of a person's public findings.
8. ownership.ts:816 `acquireOutlet` eligibility and :691 `reduceNewsroomStaff` (cash below payroll, share kept) and :1060 purchase terms: buyer cash vs price, seller willing, books distressed. Inputs: books (net, debt), cash, price tier. Currently reads `townFinances` and resources.
9. neighbor-news.ts:58 `peopleTiedTo` (close vs known reach): who hears. Inputs: household, kin, partner, warm ties. Core2 indexes `relationshipsByPerson` already.
10. news-habits.ts:23 `newsHabitOf`: followed jurisdictions and `followsClosely`. Inputs: home place, offices, curiosity, age, retirement.
11. national-mood.ts:53,200: mood = change in support share for the president among adults since entry. Core2 should keep a rolling aggregate instead of rescanning adults.
12. speech-retelling.ts:73 `speechSalience`, :91 `strengthFor`, :63 `step`: memory strength; replace hard marks with a continuous score.
13. press/law-effect-news.ts:455 `effectPhrase`, :233 `exposureTouches`, :161 `flowTermTouches`: grouping rule (one record per law, town, step); the grouping is a keeper, the phrase is English-engine.

## 5. CORE2 MODULE INPUTS

**State owned (Maps keyed by id):** `outlets` (+ `outletsByPlace`, `outletsByOwner`), `reporters` (person, outlet, beats, tenure; `reportersByOutlet`), `owners` and `holdings`, `leads` (`leadsByOutlet`, `leadsByMatter`, open-leads set), `matters`, `proceedings` (+ `proceedingsByRespondent`, `findingsByPerson` index so readers never scan), `sourceAgreements`, `moodAggregate` (support share by official, rolling), `habits` cached per person. Publications and stories are retained log (player-visible); leads, dispositions and decision traces keep only results.

**Acts for ordinary people:** ask a reporter for an interview (actor person, target reporter, prereq: eligible journalist role, public basis); give ground rules/leak (prereq: knows a fact, has a reporter contact); answer or decline comment on a story; file a complaint with a body (prereq: knows an allegation, body has authority); respond to a complaint; read a publication (prereq: outlet in habits); tell a neighbor (prereq: knows a fact, tie). **Officials:** spend campaign funds personally (misconduct act), report a bookkeeper's concern, call for resignation (prereq: a public finding), buy an outlet (prereq: cash >= price, seller sells). **Owners/reporters as ordinary agents:** cut staff, acquire, order sharing; reporter takes assignment, publishes, narrows, holds, drops.

**Effects:** publication writes knowledge to readers by habit and tie; a finding cuts campaign support and later-contest weight; restitution and referral call the money and justice engines; a purchase moves cash; a staff cut ends jobs; a news exposure to a law writes a law exposure and official-view update.

**Typed events (public record / news = P):** `story-published` (P), `story-corrected` (P), `matter-opened` (P when public), `complaint-filed` (limited), `proceeding-step` (P when `publicStep`), `finding-issued` (P), `subject-responded` (limited), `outlet-sold` (P), `newsroom-cut` (P), `interview-published` (P), `law-effect-reported` (P), `job-ended` / `move` / `birth` (neighbor news, circle only).

**Calendar and tier:** outlet weekly desk (weekly tier, one handler per outlet cohort); owner review on owner cadence (monthly); ledger review every 30 days (monthly); proceeding step due items (calendar, exact day); speech retelling (monthly); law anniversary (annual per law); mood recomputed on election day only. Reporter tier is daily only when in the player's circle or focus place, else weekly.

**Data to reuse:** `data/research/legislative-procedure/inquiry-subpoena-rules.json`; the 24-row ethics-body table (move from `state-ethics-bodies.ts` to data); `trait-act-pulls.json` for trait pulls on reporter acts; ownership pack as JSON; `MISCONDUCT_FAMILY_ROWS` (records.ts:155) and `LOCAL_PROFILES`/`STATE_PROFILE` (outlets.ts:188,228) as rows; `STORY_EFFORT_ESTIMATES` (story-effort-data.ts).

## 6. DEPENDENCIES AND RISKS

**Needs first:** people/relationships/knowledge, jobs (reporters are ordinary employees), money/resources and `townFinances` books, organizations, the events/public-record layer, campaigns and support, legislature and law exposures (law-effect news), justice (referral), governing (restitution), macro-economy releases, the shared decision engine.

**Riskiest:**

1. The desk consumes every other engine's `history.events` by type prefix and tag (`EXCLUDED_PREFIXES` desk.ts:119, `beatForEventType`). Core2 has no global event list; each engine must emit typed events with a `newsworthy` payload, and the desk subscribes via `onEvent`. Missing producers show up as silent gaps.
2. Hot scans: `recordProfessionalReaders` loops `Object.values(world.people)` per local publication (desk.ts:1325); `lawNewsReaders` scans all people per law event (law-effect-news.ts:746); `nationalMoodDemocraticShift` loops all adults twice (national-mood.ts:218); `reporterWorkBudget` loops `workItems` per reporter. Each breaks the 20% speed budget in core2 unless indexed (peopleByPlace, habits by outlet).
3. Validators: `integrity.ts` (786 lines) and `public-information-integrity.ts` (392) are whole-world checks that core2 does not have; do not port, replace with act prerequisites and tests.
4. Save format: `pressRecords` is a 20-kind append-only union with stable keys and `PRESS_POLICY_VERSION`; many consumers read `stableKey` strings (`press46:lead:...`). Core2 gets a new save; anything tagging with these strings (tags like `press.matter:`) must be redone as typed fields.
5. Per-place tables and Kentucky special-casing in .ts (state-ethics-bodies.ts, generated-state-oversight.ts:83-130, procedures.ts:214, outlets.ts profiles) must become data rows keyed by place; `procedureForSubject` (matters.ts:631) routes by state key.
6. Dice-adjacent: seven `close-choices` decisions and seeded outlet names, reporter temperaments and founding owners. Rewrite reporter temperament from the reporter's person traits, not a range pick; keep names/founding as world-generation only.
   Also: heavy coupling to the `evaluateDecision` trace API (`recordDurableDecisionTrace`), and to `futureDueItems` as the only scheduler.

## 7. LIFE-REPLAY STEPS

- Fully supplied: none; the press is a consumer of life steps and the producer of consequences.
- **candidacy / election-result / reelection-decision / office-service (partly):** the press supplies coverage (campaign beat), findings that cost support (`campaign-support.ts:327`, `rememberedAdverseFindingsAgainst`), and mood for midterm results (`national-mood.ts:200`). Lacks: findings only target matter respondents; no coverage-driven turnout or endorsement effect, mood is presidential-only.
- **law-signature / legislative-proposal:** `law-effect-news.ts` supplies the weekly town story and anniversary; lacks coverage of a proposal's passage stages beyond the `legislative.` prefix beat, and no editorial endorsement (editorials are only continuity text in `editorial.ts`).
- **employment (partly):** reporters are employees; `recordJobEndedNews` (neighbor-news.ts:143) tells close ties. Lacks: a laid-off reporter seeking a job (ownership.ts:66 NOT MODELED).
- **residence-move, family-loss, partnership (partly):** `tellPeopleOf`/`peopleTiedTo` spread the news; `life.couple-ended` opens a personal-life matter (desk.ts:1584). Lacks: death/obituary notices, partnership formation news, anyone outside ties reading a local paper's life section.
- **business-formation (partly):** only outlets (`acquireOutlet`, `purchaseOutlet`) and none for ordinary firms; no ad revenue tying outlets to business health.
- **public-appointment / chamber-leadership / office-succession (partly):** covered as events by `outletCovers`; no press-initiated vetting.
- **military-service / military-deployment / military-authorization-request:** only the `international.`/`crisis.war-powers` beat mapping (desk.ts:2061); nothing else.
- **education-\*, cause-participation, health-shock:** none; `health.episode-disclosed` maps to the public-safety beat only.

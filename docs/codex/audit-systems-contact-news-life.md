# Meeting a law does not yet connect every person to an opinion

A bill's sponsor can receive a dated question exposure and then form a private view. Paychecks, conversations and news have separate records, but the inspected production routes do not connect all of them to question exposures. Week-one news also depends on publication timing, public source eligibility and delivery. Law-effect stories can reach living local households; ordinary stories do not automatically reach everyone. Builders need to preserve contact, knowledge, question exposure and opinion as separate steps. Research must supply life-pull sizes; this review supplies no new coefficient.

## Contact comes before a question-specific opinion

Measured source: filing a bill exposes its sponsor to each named proposition through exposeSponsorToQuestions at src/simulation/legislation.ts:1641. No sponsor or no proposition means no exposure at line 1648. The producer records direct-experience provenance on the filing event at line 1662. A bill existing in history therefore does not expose every legislator or household to its question.

Measured source: targeted reflection refuses a missing person, the controlled player, non-direct-experience provenance and an already newer belief at src/simulation/living-world/political-reflection-schedule.ts:25. It rejects duplicate scheduling at line 38. It forms supported life principles, checks a nonzero bearing and schedules one day later at line 47. A heard or media exposure would currently fail this targeted gate even if an adapter recorded it with that provenance.

Measured source: the handler checks the saved exposure and controlled person again at src/simulation/living-world/political-reflection.ts:134. It selects a newer encountered question, rather than every catalog question, at line 193. With no encountered question it resolves nothing-encountered; with no grounded factor it resolves no-grounded-factor. The periodic fallback cadence is 90 days at line 85.

Measured source: the principle factor's direction comes from the saved principle sum, but its importance is always strong and confidence high at src/simulation/living-world/political-reflection.ts:234. Thus this adapter does not continuously scale belief influence with principle magnitude. Private beliefs are separately written by applyNpcPoliticalBeliefFormation through recordPrivateBelief at src/simulation/political-belief-formation.ts:291. The scheduler itself writes no opinion.

Measured source fixture: political-reflection.test.ts contains four cases: cited view after reload, no opinion without a bearing, reconsideration after a later encounter and controlled-player refusal. Its supported NPC fixture expects one scheduled item, one private belief and one decision trace after one day at src/simulation/living-world/political-reflection.test.ts:92. These are inspected assertions; zero cases were executed in this review.

## Own paycheck, actual contact and press knowledge are separate routes

Measured source: assessPaycheckTaxes admits a positive USD work transfer to a person and skips already assessed outcomes at src/simulation/statutory-tax.ts:96. PaycheckLawLines selects only that person's dated liabilities carrying law-measure IDs at src/presentation/law-exposure-lines.ts:169. It can tell the player which law withheld money. Neither inspected function writes a proposition exposure or private belief.

Measured saved example: Jennifer Conway in Appomattox, Virginia, has pay recorded as 189,200 cents before and 224,000 cents after in docs/codex/handbacks/team-5-teacher-five-state-receipt.json:18. Three transfers record 224,000 cents each. The receipt proves saved pay lineage; it exports no question exposure or formed opinion about that paycheck. It therefore cannot establish that a higher paycheck caused a political view.

Measured source: a direct conversation writes knowledge for the people actually present at src/presentation/life-conversation.ts:937. A told experience reaches its listener only when the saved result says it was heard at line 952. This is a contact-to-knowledge route. No proposition-exposure writer appears in the inspected conversation route. The source search found no dedicated contact-legislator-to-reflection bridge; contacting an official must not be counted as a newly formed opinion without that record.

Measured source: an explicit transit report read writes event knowledge with publication reference at src/presentation/transit-report-reading.ts:130. Generic press publication writes knowledge to subjects, colleagues and relevant party contacts at src/simulation/press/desk.ts:1230. Knowledge records themselves append only knowledge at src/simulation/records.ts:176. They do not call the question-exposure or belief writers.

Inferred integration gap: the bounded search found one non-demo production caller of recordPropositionExposure, the sponsor filing path at src/simulation/legislation.ts:1656. Own pay, actual legislator contact and press knowledge need explicit supported question mapping before they can enter targeted reflection. This is a call-site finding, not a claim that no future team branch implements the connection.

Required builder contract: preserve actual person, event, date, governing law and question IDs at each contact. Record knowledge only when observed or delivered. Record proposition exposure only when the encountered content supports that question. Then schedule NPC consideration with supported factors; keep player belief choices under player control. Expand media/told provenance intentionally rather than disguising it as direct experience to pass the present gate.

## Week-one news has timing, source and delivery gates

Measured source: press opening schedules its first sweep seven days later at src/simulation/press/desk.ts:152. Routine stories are scheduled one additional day later; the intervals are seven sweep days, two response-window days, one routine-publication day and seven hold-recheck days at line 85. Inferred timing consequence: a seven-day receipt can stop on the first sweep before its newly assigned routine story publishes. Opening archives are a separate path and may already supply news.

Measured source: opening archive publication admits recent public candidates from a 90-day lookback, excluding family local-matter and international tags at src/simulation/press/desk.ts:171. The regular candidate gate rejects private, future, setup, life, time and publication-plumbing events at line 1471. A supported publication source is required. Merely accumulating ordinary household history does not make that history public news.

Measured source: each sweep first produces law-effect and law-outcome reports, then routes eligible new events through outlets at src/simulation/press/desk.ts:1449. Outlet coverage, existing stories, active assignments and newsroom capacity constrain selection at line 1539. The code admits at most one routine item per sweep per outlet at line 1592. These are source constraints, not measured counts of articles withheld in a particular week.

Measured source: law-effect delivery differs from generic professional reading. LawNewsReaders adds involved people and living members of local households, then the sponsor and applicable chamber voters at src/simulation/press/law-effect-news.ts:735. Desk publication calls that reader at src/simulation/press/desk.ts:1242. Household news reach therefore exists when a qualifying law-effect story is actually published.

Measured inherited week receipt: the Abbeville, Georgia comparison advanced seven days and retained zero generated Georgia House bills, then supplied 68 unsponsored probes for 180 members. Its denominator is 12,240 paired decisions in docs/codex/handbacks/team-2-georgia-all-catalog-weight-comparison.md:47. Cameron Salas's term-limit result is present to yea at line 62. Those unsponsored probes cannot create sponsor exposures through the filing gate. They are decision-reader probes, not recorded floor votes or newspaper delivery evidence.

Unmeasured gap: that receipt exports neither publication counts nor household knowledge counts. Zero generated bills does not prove zero news. No saved publication/delivery receipt for the owner's specific week-one household was identified in this bounded review. The absence's exact cause remains open.

Recommended existing-lane diagnostic: preserve sweep due date, eligible public events by rejection reason, outlet coverage/capacity, assigned leads, scheduled publication dates, publications and delivered person IDs for the same saved week. Count each stage separately. That trace will distinguish a missing occurrence, publication delay, editorial rejection, delivery gap and a UI read-model gap.

## Life-pull research has three concrete entrypoints

Measured source: principlePullsOf reads the person's recorded family, confidants, affiliation, cohort, membership, place, work, home ownership and lived job loss at src/simulation/principles-from-life.ts:323. PrinciplesFromPulls combines them at line 580. FormPrinciplesFromLife appends changed supported records at line 686. It visits parents first, limits recursion to three levels and excludes the controlled character. Adults become eligible at age 18 at line 810.

Measured authored units: PrinciplePull currently permits one, two or three developer points at src/simulation/principles-from-life.ts:68. The writer divides by four before combination at line 604, yielding normalized weights 0.25, 0.50 or 0.75. Its formation threshold is 0.4375 at line 181. Those are authored scale values, not probabilities estimated by research. Parent inheritance uses two points; public party and cohort cues use one. Source lineage must accompany any replacement.

Measured arithmetic contract: combinePrinciplePulls requires a finite weight in [0, 1) and a nonempty evidence key at src/simulation/principle-strength.ts:23. It deduplicates repeated evidence, combines same-direction support as one minus the product of remaining support, and subtracts opposing support. Two distinct 0.25 pulls produce 0.4375 support. Repeating the same evidence does not add another pull. The resulting strength is bounded, but that bound supplies no empirical effect size.

Measured historical example: Heather Savage in Adair Village, Oregon, has a tradition record grounded in cohort and small-town facts in docs/codex/handbacks/team-1-principle-example.json:53. Its formation cites two fact IDs and explains both pulls at line 94. The receipt records 11 new rows among 11 selected people at line 42. Its older source does not certify today's continuous strength or every surveyed adult.

Measured research boundary: the saved design answer says goals, values, knowledge and lived consequences are primary inputs; family supplies cues without compulsory inheritance at `docs/research/chatgpt-answers/2026-09-22-depth1/DEPTH1-RESEARCH-AND-ANSWERS.md:62`. The follow-up request explicitly says this does not settle input-to-principle directions or sizes at docs/research/requests/where-principles-come-from.json:19. Production developer data still identifies Team 9 socialization ranges as pending at src/simulation/principles-from-life.ts:183.

Measured null boundary: all 56 jurisdiction culture records have leanings null at src/simulation/nationwide-world/political-culture.ts:56. The reader emits no factor when leanings are absent at line 91. Null means unknown, not zero or neutral. The exact newer Team 9 calibration packet was not available at this source pin; no numerical value is inferred from its absence.

Proposed research plug-in contract: Team 9 supplies an evidence identity, principle, observed predictor, population and jurisdiction scope, date window, predictor unit, outcome unit, supported interval and conversion method for every admitted pull. The life reader translates actual saved facts into those predictors. The combiner remains pure. Reject unsupported extrapolation, duplicated evidence and unit mismatches; preserve explicit null calibration rather than substituting an invented coefficient or midpoint. Existing authored values remain labeled until an approved replacement is supplied.

## Method and next ownership

Source was read at fd4925e6a6dae3446d2fefe40df2cfc2d2ef931e with no checkout or Git mutation. Named examples are preserved receipts with their own source limits. Zero runtime tests, worlds, browser checks or production changes were performed. Engineering teams own the contact adapters, press diagnostics and life-pull research binding; Audit/Systems owns this source contract diagnosis. Parent review remains required before publication.

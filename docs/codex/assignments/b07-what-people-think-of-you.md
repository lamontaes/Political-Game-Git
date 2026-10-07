# What people think of you: word of mouth, the paper, real polls (bank id b07, phase P1 council journey; unlocks "people bring up your vote" and "next election runs on the record")

Verified against origin/main 1ee0abcda. Bank spec: docs/codex/specs/bank/b07-what-people-think-of-you.md.

## What the player experiences

On the council there is no approval number. Your sister tells you what her coworkers said about your vote. A man at the hardware store brings up the story in the paper. The local reporter writes that you switched sides. People who read the paper or hear from friends form their own opinion of you and pass it to the people close to them. You can open a list of the people you know and read what each has told you, with who and when; it never adds up to a total. Higher up (governor's race, Congress and above) polls exist because somebody pays for them: a newspaper, or a campaign with enough money. A poll asks real people in the game and reports what they said with a real margin of error, so it can be off. Nobody, not even you, sees what everyone thinks.

## Owner decisions it rests on

- "Opinion: word of mouth and local paper at council; real polls higher up."
- Owner answer (this round): council-level opinion shows as scenes and the local paper PLUS a list of what each person you know has told you; no approval number; real polls only higher up and paid for by someone.
- Owner decision Sept 22 (approval-ratings research): "Show a numeric approval percentage to the player only when an in-world poll actually measured it... Keep the game's latent public attitudes separate from an observed poll result."
- News spreads by word of mouth through relationships; polls can be wrong (Constitution item 13).
- Local reporter bank item is separate; this only reads published stories.
- Fixed rules: zero dice; nothing blank, estimate from similar places and mark it; one rule for all 50 states, D.C., territories; emergent; real data calibrates the start only; one writer per record kind; delete what you replace.

## Existing code to extend (verified)

- `src/simulation/official-view-reads.ts`: `viewOfOfficial` :168, `strongestOfficialStanding` :192, `townSupportFromViews` :277. townSupportFromViews is a town total; its only non-test caller is `official-views.ts:100` (import). It must not reach any player screen.
- `src/simulation/living-world/official-views.ts`: `officialViewReflectionHandler` :168, `followsNewsClosely` :279 (exported), `peopleKnownTo` :301 (exported), `hearersOf` :355 (NOT exported; export it or add the retelling inside this file), `reactionLens` :780 (exported).
- `src/simulation/law-exposure.ts:168 recordHeardExposure` (only first-hand experience is retold); `neighbor-news.ts:58 peopleTiedTo`, `:96 tellPeopleOf`.
- `src/simulation/press/desk.ts`: `pressDeskSweepHandler` :1481, `eventIsNewsCandidate` :1553, `outletAssignmentCapacity` :272. `press/story-exposure.ts` (header: a story exposure "carries no money and no opinion weight"): today a reader of a story about a law's effect gets a law exposure and no view. `press/outlets.ts:402 mediaOutlets`, `:564 ensurePressLocalCoverage`.
- `src/simulation/campaign-polling.ts`: `campaignPollingQuality` returns `{reader, drawBasisPoints}`. CORRECTION to the bank spec: `drawBasisPoints` (:48, :113-119) is not read by game code at all, only by `campaign-polling.test.ts:80,88`; `campaigns.ts:26` imports the function and uses only `.reader` (~:1621 area, in `recordCampaignActionOutcome` at :1524). `surveyWorkDays` :60 stays (it finds survey-trained staff; reusable to pick who runs a poll). Dead dice confirmed.
- `src/simulation/campaign-polling-estimate.ts`: `campaignOfficePollingEstimate` :39, `...District...` :77, `...StateDistrict...` :138, label "Estimate, no poll of your own yet" :204. This is the nothing-blank fallback; keep.
- `src/simulation/election-contests.ts:177 countRecordedVoterBallots` (the one voter decision, `randomness: "none"` at :283). Only other caller: `living-world/local-elections.ts:1146`.
- `src/simulation/political-belief-formation.ts`: `evaluatePoliticalBeliefFormation` :99, `applyNpcPoliticalBeliefFormation` :312; `politics.ts:99 recordPrivateBelief`.
- Newer code covering part: none on main for polls or story-formed views. Research already in the repo: `docs/research/chatgpt-answers/2026-09-22-nationwide-2315/OCD-APPROVAL-RATINGS--MEASUREMENT-AND-OWNER-DISPLAY-RULE--2026-09-22.md` (which offices have polls, what must travel with a poll), and `docs/research/requests/campaign-polling-accuracy-by-who-does-it.json` (filed, unanswered).

## Build steps (one PR each)

1. **Reading about an official forms a view.** In `official-views.ts` (Session 21 owns the reflection writers; Others may touch this file; work anyway; whoever merges second rebases; message the owning session directly with specific questions and keep building), when a person gains knowledge of a published story whose basis event names an official's act (vote, quote, finding), form or adjust their view through the same formation path the reflection handler uses (act versus the reader's own held view on that question, trust in the outlet, `reactionLens`). Readers are only people who actually learned of the story (knowledge records). Must not: give any story to everyone; touch `story-exposure.ts` law exposures (that stays the law-effect path).
2. **Opinions travel by word of mouth.** When a person's view of an official is formed from experience or reading, their `hearersOf` learn it (`recordEventKnowledge`, told-by the holder). A hearer may form a weaker view from a trusted person's cue via `evaluatePoliticalBeliefFormation`; hearsay is not retold (same rule as `recordHeardExposure`); conflict-averse people tell no one. Runs only when a view is formed, never on a schedule.
3. **What the player hears, and the "people you know" list.** Give Session 4's situation reader the views of the player held by people present, so they bring it up. Add a list (Session 14 places it) of only what the player has been told or seen said: who, what, when. Never a total, count of positive vs negative, or colored meter. Data source is the knowledge records written in step 2 where `told-by` or an observed statement reaches the player.
4. **Polls are things someone pays for.** New `src/simulation/polls.ts`: `commissionPoll(world, {sponsorId, contestId | officialId, sampleSize, fieldedAt})`. Respondents are registered voters of the area chosen in `world.personOrder` order seeded by the poll's stable key (selection only, not outcome). Each answers through the same decision as `countRecordedVoterBallots` (factor the per-voter decision into a function both use; do not copy it), or by view sign for approval. Some decline for their own recorded reasons. Result = shares, real margin of error for the completed sample (`1.96*sqrt(p(1-p)/n)` for the worst case, stated with population, sample, field dates, as the research file says), saved as a poll record with respondent ids. Cost = completed interviews times a researched price (table below), paid from the sponsor's money.
5. **Who commissions polls.** Outlets decide through `evaluateDecision` from their recorded coverage area, audience size and reporting budget (`outletAssignmentCapacity`) whether a race or official is worth a poll; campaigns can buy one when b02's treasury covers it. No office-tier rule: council races get none because nobody can pay. Polls publish through the press desk as stories.
6. **Delete the dead dice, keep the fallback.** `Replaces:` `drawBasisPoints` (type field, computation, and the two test assertions; replace them with tests of the new poll). The field memo reports the latest poll the campaign paid for; with none it keeps the similar-district estimate. The unanswered request `campaign-polling-accuracy-by-who-does-it.json` is closed by this: a volunteer/staff-run survey uses small samples and so a wide real margin; do not reintroduce invented tiers.

## Must NOT build

An approval rating, popularity meter or "town mood" number at council level; any poll result not computed from real residents' decisions, or random poll noise; a view of everyone visible to the player; a second belief or knowledge writer; a scheduled gossip tick; authored lines about the player's reputation; a poll-sponsor rule by office tier.

## Research tables

Found in repo (use these): approval-poll practice by office level and what a poll record must carry (sample, population, field dates, margin): the OCD-APPROVAL-RATINGS file above. Examples there: Morning Consult state margins +/-1 to +/-6; PPIC Sept 2026 1,745 adults, +/-3.0 at 95%. Council and state-legislator approval nationally: UNKNOWN in that file, which matches "no polls there".

Price per completed interview (missing from repo; ONE web search done, Oct 5, 2026; summary only, weak sources):

| Item                                                   | Value found                                                  | Source                                                                                                                                |
| ------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Telephone, per completed survey                        | $36 to $53                                                   | survey-methods cost comparison pages surfaced by search (springer 10.1186/1471-2288-12-32 and similar); older and health-survey based |
| Web-based, per complete                                | about $46 to $80                                             | same                                                                                                                                  |
| Whole local-race poll, as quoted by campaign pollsters | $15,000 to $25,000 low end; $30,000 to $40,000 another range | Daily Montanan, 2023-08-22, "Polling experts weigh in on contested Realtors' survey"                                                  |

Judgement for the build: these are thin. Store the per-complete price as ESTIMATED in a data file with this table's range and the sources, scaled by the place's wage level the way other costs in `data/research/money` are, and do one follow-up search (10 min) for a cleaner source before merge if the owner wants it exact. Do not invent a single "real" number.

## Done when (played-game proof)

- Random town, player on council: after a contested vote the paper runs the story. Print three readers whose view of the player changed with their reasons, two of their confidants who heard it (hearsay not retold further), and one of them bringing it up in a scene. The "people you know" list shows only what the player was told.
- Random state, governor's race: an outlet commissions a poll (print decision reasons, cost, who paid), the shares and margin are printed with respondent ids; the actual count later differs within reason. A council race in the same world gets none, and no number appears anywhere on a council player's screens.
- Tests: `polls.test.ts` (same world, same poll; respondents answer like their ballots; margin matches sample size; declined respondents counted out), `official-views.test.ts` (readers form views, non-readers do not; hearsay not retold; conflict-averse tell no one), `campaign-polling.test.ts` updated (no drawBasisPoints), a test that no file under `src/presentation` or `src/player` imports `townSupportFromViews`.

## Proof to post

Printed readers/confidants/scene line, the poll record with decision reasons and cost, the delete list, typecheck plus changed tests green.

## Standing rules

NEVER STOP WORK WAITING ON THE OWNER. When a decision is open, build everything that does not depend on the answer, plus the switch for it: a data row, a setting, or one function with the options stubbed. Log the question in the docket and keep building.

- Council-level display was answered: scenes + paper + a list of what each person has told you. Switch = a setting row `opinionListAtOffice` (list of office tiers where the list shows; default all) so a later owner change is one row. Poll price per interview = a data row marked ESTIMATED; poll sponsor rules = outlet decision function reads coverage, audience, budget, no tier row.

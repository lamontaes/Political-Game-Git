# Off-screen campaigns as results (design, Nov 8, 2026)

Written by Speed after the owner's 9:50 a.m. note. Status: proposed, not built. The stages below are the order of work.

## The owner's rule

"You're simulating, not generating. You're just writing things and making the history match." "It doesn't need to be checked." "You prove that it works in the simulation and you move on. Same thing with press interviews, candidates, daily turns, the news rebuilds." Off-screen activity becomes a result by group. The detail (who came, what was asked) is built when someone opens it and agrees with the stored result.

The patterns already in the code are `rollCallOf` (`world-legislating.ts`, a roll call built on open from the count) and `fillInPerson` (`state.ts`, a person built from what the records already say).

## What an off-screen event costs today (measured)

Counted with call counters, Smackover, Arkansas (key 0564730, seed n8b2) and Montpelier, Vermont (key 5046000, seed mont1), election year (2028):

- Montpelier: 483 events by 31 candidates, 763 statement rounds reaching 147,880 listeners, 11,612 door rounds (26,849 volunteer hours), 15 debates. Smackover: 155 events, 394 statement rounds, 15,262 listeners, 4,087 door rounds, 338 interviews.
- CPU profile of Montpelier's election year (688 s sampled): campaigns 206 s, of which the daily turn 101 s, statements 72 s (speech delivery 58 s), events 49 s, door shifts 34 s, debates 32 s; event fan-out (`emit`) 77 s; garbage collection 90 s.
- Inside one event (Gunnison, Utah profile): about 75 percent is speech delivery, where each listener is a witness of an event that the views, drives and life engines all react to, and about 20 percent is each adult deciding whether to come (`whoComes`).

## Who reads what an event writes (so the result can replace the rows)

- A voter's impression of a candidate (`impressionOf`): read only in `voting.ts` and `campaigns.ts`. `touchImpression` is written from `campaigns.ts`, `press.ts`, `meetings.ts`, `constituent-cases.ts` and `office-day-federal-president.ts`.
- "Heard of" (`heardOf`): `voting.ts`, `press.ts`, `corruption.ts`, `recalls.ts`, `past-public.ts`, `campaigns.ts`.
- Causes (the `causes` table): only `campaigns.ts`. Cause summaries: `campaigns.ts` and `campaign-day.ts`.
- A speech's effect on a listener's view: the views engine's stance rows (`views.ts`), read by votes and by the legislature.

The reader set is small, which is what makes a result by group possible.

## Proposed shape

1. A result row per campaign, voter group and day: how many in the group came or were reached, and the warmth and view shift that gives the group. The group is the one the counted population already uses (lean, age band, party).
2. A full person nobody is watching (not in the player's circle, not in focus) has no row of their own for an off-screen event. `impressionOf` and the stance read add the group's result to the person's own rows, the way a counted voter is read by the same rule times the count ("one model, two tiers").
3. Opening a person, a speech or a campaign builds the detail with a pure function of the stored result and the record ids (who came, what was asked), so the same click gives the same answer, and it agrees with the result.
4. The player's circle and focus people keep real rows, as today.

## Order of work

1. Rival events: `holdEvent` (`campaigns.ts`) and `whoComes` become a group result; attendees are built on open. Measured share: 38 percent of an election year by the CTO's reading, 49 s of 688 s for the event itself in Montpelier and most of the 77 s of fan-out.
2. Press interviews (`pressWeek`, `press.ts`): an interview's outcome (asked, accepted, the story) instead of the questions scored for each; questions built on open. About 25 s a year in larger towns.
3. Daily campaign turns (`campaignTurn`): a turn's reach and spending as a result by group.
4. The news rebuild (`countedNewsGroups`): already incremental after #7437; its remaining cost goes when audience reads become group results.
5. Fast-forward then runs the same group results, so twenty years is the same code with fewer details, not a second engine.

## Proof

For each stage: dev mode's records proof (same seed, differences named by table) shows that only the campaign tables change; a played year shows the election results in real ranges on three random places (winners, margins, turnout, as in #7405 and #7525); and opening a person, speech or interview gives a detail that agrees with the stored result and is identical on a second open.

## Risks

- Voting reads impressions for every voter on election day. The group read must be as cheap as a row read, or the cost moves rather than goes.
- Campaign tests build small worlds and read rows directly; they need the group read too.
- The views engine moves a listener's stance by their standing with the speaker; the group result has to carry that without a per-person standing.

## Stage 1, step 1: the plan after the Coordinator's yes (Nov 8, night)

The Coordinator answered the two questions on #7365: a group result is right for a speech with no one from the player's circle, a focus person or an official in the audience (a full person in the audience hears it as a person), and the `viewOn` read-path change is made in the same pull request, naming `views.ts` (Tiers' opinion store) in its body, with `viewOn` reading the group result through the one store. Proof asked for: records identical for every full person who is watched, the counted groups' views equal to the person-by-person sum within rounding, and alternating-pair year times.

What the code already has, so nothing is built twice:

- `stanceAfterCase` (`views.ts`) applies one heard case to a person or to a counted group: `HeardCase.size`, `nearness`, `exposure` (the audience mass over the represented population) and `hearer`. `hearCountedNews` and `countedNewsGroups` already move a counted group's stance this way for a news story.
- `deliverSpeech` (`speech.ts`) emits one `SPEECH_HEARD` event with the whole audience in `witnessIds`; each witness goes through the views engine's `onEvent` (its `standingWith` the speaker, `stanceAfterCase`, a row put) and the drives engine's `respond`. This is the cost: 19 s of `deliverSpeech`'s 24.8 s in Montpelier's election year.
- A watched person is the player, their household and circle, `core.focusPersonIds` and an official (`allOfficials`).

Steps, each its own pull request with a records and results proof:

1. In `deliverSpeech`, for a speech by a world candidate (`faceToFace`, not the controlled person), split the audience into watched and unwatched. Watched people stay in `witnessIds`. The unwatched go to a new `hearAsGroups` in the views engine, which groups them by what `countedNewsGroups` groups by (lean, age band, party), takes the group's mean `nearness` and `engagement`, and writes one group row per question through the counted store with `exposure` equal to the group's share. No `SPEECH_HEARD` witness, no drives response, for the unwatched.
2. `viewOn` (`views.ts`): for a full person who is unwatched, add the group's accumulated shift for their group to `stanceOn` (one store read, keyed by the group, not a scan). A person who becomes watched (met, clicked, circle) takes the group's shift into an own row at that moment, so the view does not jump.
3. Opening a listener: build the detail (that they came, what they heard) from the stored group result and the record ids, the same on a second open.
4. Then the same for news reads (`onAfterDay`, `NEWS_READ`), then `pressWeek` interviews, then the daily turn.

Proof for step 1, in order: (a) the records proof on Dickey n8g7 shows only the views, drives and speech tables differ and every watched person's rows are identical; (b) for one race, the sum of the unwatched people's stance moves by person (the old path, kept in the test only) equals the group's shift within rounding; (c) election results (winners, margins, turnout) on three drawn places stay in real ranges and the winners match the old path's in all but a stated few; (d) year times in alternating pairs on Montpelier VT (mont1, 5046000) and Gunnison UT (n8f6, 4932660). Expected saving: most of the 19 s of fan-out in Montpelier's election year, and the emit share of Gunnison's town halls.

Not started in code at the time of writing; the first session to pick this up begins at step 1 on a branch from main.

### Step 1b: the campaign daily turn (reordered first by the Coordinator, Nov 8, 11:05 p.m.)

The election year is the one over the bar, and campaigns are 38.5 s of Gunnison's 167 s year 4 (`takeCampaignDayChoice` 11.7 s, canvassing `volunteerShifts` and `walkWith` 8.2 s, `makeStatements` 5.4 s). What the door path writes today, from `walkWith` (campaigns.ts): for a counted household, a counted reach and an `answerAtDoor` with no cause (the group branch already exists, using `countedAgreement` and `countedDoorWarmth`); for a full person who answers, a `reach` (an impression touch and a cause row), a `contact` relationship tie, a `retell`, and an `answerAtDoor` with the cause. For an unwatched full person the same group branch can stand in, but their impression of the candidate is then not a row of their own, so `impressionOf` (read only by `voting.ts` and `campaigns.ts`) must add the group's door-contact result to the person's own rows, the same rule as `viewOn` for speeches: one store, one read, keyed by the group, and a person who becomes watched takes the group's share into an own row. The proof is the same (watched people's records identical, the group equal to the person-by-person sum within rounding, three places' election results in real ranges, alternating-pair times), plus the door-pledge and petition tests, which read who was asked.

### Measured before building: the speech group result is not worth a store (Nov 8, night)

Gunnison UT (n8f6, key 4932660), year 1, one run, scratch hook in `deliverSpeech` that called `stanceAfterCase` for every unwatched listener and compared the person's move to their group's mean move (not committed). 461 speeches reached 18,535 unwatched listeners, about 40 a speech.

| Group key                                                                                             | Groups | Groups per listener | Mean error   | Max error         |
| ----------------------------------------------------------------------------------------------------- | ------ | ------------------- | ------------ | ----------------- |
| Exact: lean, engagement, age decade, standing, prior stance, openness, agreeableness, all to quarters | 13,750 | 0.74                | not measured | 0 by construction |
| Lean, engagement, standing to quarters; age decade                                                    | 13,709 | 0.74                | 0.00015      | 0.0093            |
| Same to halves                                                                                        | 9,669  | 0.52                | 0.00034      | 0.0106            |
| Same to whole numbers                                                                                 | 7,761  | 0.42                | 0.00043      | 0.0121            |

Accuracy is not the problem; compression is. An event is too small (about 40 listeners) for groups to pay, and working out each listener's key costs about what working out their move costs. Ceiling: removing every unwatched listener from every rival speech took Gunnison year 1 from 105.1 s to 98.1 s (6.7 percent). In Gunnison's year 4 the whole listener fan-out (`onEvent`: drives `respond` 2.5 s, `standingWith` 1.0, `stanceAfterCase` 1.0, `putOwned` 0.8) is 8.3 s of 167 s. Decision (Coordinator, 11:14 p.m.): no group store for speeches.

Step 1b (Coordinator, 11:18 p.m., option a): a world candidate's event or door round that no full person the player deals with (circle, focus, officials, anyone met or clicked) attends, and that no town race reads per person, becomes one row of reach and warmth for each voter group the race reads, with no per-listener rows. A person the player deals with who was there keeps their own rows, and a listener filled in later takes the group's row as their starting impression. The count of events and doors still comes from the candidate's own plan, money and volunteers; only the per-listener bookkeeping goes. Proof: race totals and margins within rounding, winners identical at three drawn places, full people's records identical, and election-year time at Gunnison and Montpelier in alternating pairs. Not started in code.

Where Gunnison's year-4 campaign time is (campaignWork 38.5 s): `walkWith` 6.4, `groupsWeighRace` 4.6 (of which `organizedGroupsIn` 2.3, rebuilt for every race), `askForSupport` 3.6, `takeCampaignDayChoice` 11.7 (`knockDoors` 2.9, `holdEvent` 2.4, `donationAnswer` 2.3, `peopleToAsk` 1.8, `chosenToday` 1.7), `commissionPoll` 2.3, `rivalDay` 1.9. No piece is more than 4 percent of the year.

### Step 1b ceiling, measured (Nov 9, 12:30 a.m.)

Scratch hook, not committed: a world candidate's speech reaches only the player's circle and focus people, and a world candidate's door round (`walkWith`) skips `reach`, `retell`, the `contact` tie and `answerAtDoor` for full people outside the circle and focus. Gunnison UT (n8f6, key 4932660), main d88e748d91, four years, one run each, nothing else running, hook off then on, seconds: year 1 112.8 then 100.2; year 2 114.1 then 97.2; year 3 136.9 then 103.2; year 4 177.1 then 117.9 (minus 59 s, 33 percent; every year under 120). This is an upper bound: the hook removes the impressions and door answers voting reads, so it changes the election results, and group rows still have to be written and read. The speech-only ceiling was 7 s, so the doors are most of it.

What one answered door writes today, so the group row replaces all of it or none of it: (1) `reach` updates the answerer's impression of the candidate (`warmth' = warmth + weight × (target − warmth)` with the weight set by the pair's rapport) and a cause row (kept only for the player's circle and candidates the player runs against); (2) a `contact` relationship tie from canvasser to answerer; (3) `retell`, which reaches the answerer's adult family with a second-hand weight (more impressions); (4) `answerAtDoor`, which asks the voting engine's `doorChoice` (the whole contest's appeal) and, on a yes, replaces any earlier pledge in the contest and writes a pledge row with a firmness. A counted household already takes a group branch (`countedAgreement`, `countedDoorWarmth`, `answerAtDoor` with a `DoorVisit`, no impression row). The build starts there: an unwatched full person's door answer takes the counted branch, `impressionOf` and `pledgeOf` read the group's row for them, and the (2) tie and (3) retell go. Open points for the first session on it: the pledge is read by `pledgeDoubt` in the ballot, so a group pledge share must feed the same read; `door-pledge.test.ts` and the petition tests read who was asked; Elections/Voting reviews the `impressionOf` read.

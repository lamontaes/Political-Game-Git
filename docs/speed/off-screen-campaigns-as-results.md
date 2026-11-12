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

## Stage 3: a world campaign's turn as one result by voter group (Speed lead, Nov 11)

Status: proposed for Fable B's review on #7365; no code yet.

### Why the whole turn, not events first

Measured in South Hooksett, New Hampshire (3371220), seed s8333, on #8738's branch:

- **The cost.** World campaigns are about 40% of an election year: 223 to 282 s of a 588 to 721 s year 4. In the year 4 profile:
  - a candidate's day choice 94 s;
  - door shifts 37 s;
  - messages, mail and ads about 40 s;
  - asks for support 14 s;
  - groups weighing the race 26 s;
  - stance reads 64 s across all of them.
- **Events alone are not the lever.** With world candidates holding no events at all (an ablation), year 4's campaign work was still 223 s and the year no faster. The candidate spends the turn on doors, calls, mail and ads instead, and each act reaches people one at a time.
- **The volume.** A funded world candidate holds an evening event on nearly every turn. That is `elections-world-candidate-event-every-turn`, for the elections lead. Fewer, real campaign days cut every act at once, and come first.

### The unit and who stays a person

- **The unit:** one world candidate's turn (`campaignTurn`, `src/core2/modules/campaigns.ts`) in a race the player is not in. The player is not a candidate, staffer or volunteer in it, and does not watch any of its candidates.
- **Who is reached as a person, as today:** anyone `hearsAsPerson` (`src/core2/hearer-groups.ts`): the player, their household and circle, people in focus, state and federal officials. Also the campaign's own candidate, family, volunteers and staff.
- **Everyone else who is a full person in town:** reached as a member of their hearer group (`groupKeyOf`: place, rounded lean, age band, how readily they yield). This is the group speeches already use (stage 1).
- **Counted residents:** they keep the counted path they already take (`countedReached`, `countedAgreement`).

### What a group result holds

One row per hearer group and candidate, in a new `groupImpressions` table of the campaigns engine, keyed `${groupId}|${candidateId}`:

| Field           | Meaning                                   |
| --------------- | ----------------------------------------- |
| `members`       | full people in the group in town          |
| `heard`         | how many have heard of the candidate      |
| `knowsPlatform` | how many know the platform                |
| `warmth`        | the members' mean warmth                  |
| `contacts`      | the campaign's contacts with them, summed |
| `contestId`     | as on an impression row                   |

Each act writes its reach into it by the same rule `reach` applies to a person, with the share of the group the act reached as its exposure:

- doors: the walk's households in the group;
- mail and ads: the share the money buys;
- an evening event: the share who come, by `comes` read once for the group's mean reasons and mean trait term;
- an interview: the outlet's followers in the group.

Money stays per person in this stage: asks for donations and their journal postings do not change.

### Every reader, and how it reads a group

A full person with no impression row of their own reads their group's row, by the rule a counted voter's share is read:

| Reader                                                                                                   | Today                                                        | With a group                                                                                                                                          |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `appealFor` (`voting.ts`)                                                                                | heard yes or no; warmth; agreement if they know the platform | recognition × the group's `heard` share; mean warmth; agreement × the `knowsPlatform` share. This is the same shape as `countedAppeal`'s recognition. |
| `contestView` / `townShareKnowing` (`voting.ts`)                                                         | counts named adults with `heardOf`                           | adds each group's `heard` count                                                                                                                       |
| `contactsOf` / `townContacts` (`voting.ts`)                                                              | sums `causes`                                                | adds the group's `contacts` per member                                                                                                                |
| `campaignRecognition` (`campaigns.ts`), `knownShare`, `newsworthiness` and `outletInterest` (`press.ts`) | count `heardOf` rows                                         | add groups' `heard` counts                                                                                                                            |
| `reachablePeople` (`campaigns.ts`)                                                                       | everyone who heard of the candidate                          | individuals only, plus each group as one entry for the turn's acts                                                                                    |
| `commissionPoll` (`campaigns.ts`)                                                                        | respondents' rows for this contest                           | a respondent with no row answers from their group's row (part 1 of `core-speed-world-campaign-days-as-group-results`)                                 |
| `backingReasons`, `volunteerReason` and `donorMeetingInvitees` (`campaigns.ts`)                          | warmth                                                       | the group's mean warmth for a member with no row                                                                                                      |
| `wordReading` (`campaigns.ts`)                                                                           | the candidate's own circle                                   | unchanged; the circle stays individual                                                                                                                |
| director (`doors.ts`, `purpose-scene.ts`)                                                                | the player's door rows                                       | unchanged; the player's campaign is not a world campaign                                                                                              |

When a member becomes watched (met, clicked, joins the circle), they take the group's row as their own impression at that moment, so nothing jumps.

### Parts, each its own pull request

1. The `groupImpressions` table, its write rule (the same one as `reach`), and the read in `impressionOf` for a member with no row. Readers stay unchanged, and nothing writes the table yet. Proof: the records digest equals main's.
2. Voting reads groups by share (`appealFor`, `contestView`, `contactsOf`) and the press counts them. The table is still empty, so play is identical. Proof: digest equal.
3. World campaigns write group results for mail, ads and messages. Proof: winners and shares against main, and year time.
4. Doors and volunteer shifts, then evening events and statements, the same way.
5. Polls and asks for support.

Each part from 3 onward reports, against main on the same seed: every race's winner and vote shares, turnout, the town's recognition of each candidate, and years 1 to 4 in alternating pairs. Any winner that changes is a line to Fable B before the part goes ready.

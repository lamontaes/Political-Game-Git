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

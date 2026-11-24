# Council meetings: only what matters plays (bank id b05, phase P1 council journey)

## What the player experiences

Your council meets every other week, but you do not sit through every line of every agenda. Before a meeting you see the agenda. The items that matter to you or the town play as scenes: your own ordinance, something you promised voters, something people you know have called you about, a question that splits the council, or one that reaches people in your life. People come to speak on those, members argue, and you vote as a played moment. Everything else is summarized afterward in plain words: what passed, by how much, and how you voted. How your votes on the quiet items get cast is your call, set the way your office handles votes: decide them in one quick list after the meeting, leave standing instructions, or take every one yourself. You can always choose to sit through the whole meeting instead. Many meetings have nothing that matters to you, and that is normal.

## Owner decisions this rests on

- "Meetings: only items that matter to you or the town play; rest summarized; player can choose to sit through more."
- "Scenes scale with responsibility; quiet days normal early." Pace: council about 15–30 minutes per in-game year.
- Things happen only when they matter; the player is never decided for; zero dice.

## Existing code it must use

- `src/simulation/living-world/local-council-meetings.ts:534 localCouncilMeetingHandler`: on each meeting date, `moveOrdinances` (:265, skips the player's own measures at :276) and `fileOrdinances` (:226) run, then writes `local.council-meeting-held` with a summary of every vote (:587-627) and schedules the next meeting.
- `src/simulation/governing/council-lawmaking.ts:7-28`: members file and vote from their principles and voters; "the player is never decided for… recorded absent".
- `src/simulation/governing/chamber-votes.ts:865-881`: the player's seat casts `playerBallot` if one exists, else `absent` (`member:player-not-present`).
- `src/simulation/governing/member-ballots.ts:40 memberBallotOn`, `:63 recordMemberBallot`: a ballot the player decided ahead; `legislative-clock.ts:1693 noticeMemberVote` puts a vote on the calendar the day before.
- `src/simulation/office-workflow.ts:31 VOTING_MODES` (review-batch, prior-instructions-with-exceptions, handle-individually), `:158 recordOfficeWorkflowPreference`, `:236 recordOfficeVoteInstruction`; choices in `src/presentation/office-onboarding.ts` (around :40-66). Built for legislative seats only.
- `src/simulation/campaign-stands.ts:104 stateCampaignStand`: the player's recorded pledges.
- `src/simulation/governing/constituent-views.ts constituentsConsideration` and `provision-public-face.ts whoCaresAbout`: who in town cares about a question.
- `src/simulation/living-world/civic-actions.ts:49-52`: residents' contact and meeting-attendance events.
- `src/simulation/living-world/official-views.ts:301 peopleKnownTo`.
- Session 4's council worked row (`docs/codex/specs/session4-played-scenes-2026-10-06.md` on branch `codex/session4-played-scene-spec`, lines 111-166): chair opening, member contributions, public comment, roll call, return. `ordinary-meeting-presence.ts:57/:264` keep the access and comment writers; `OrdinaryMeetingPanel.tsx` is being replaced by Session 4.

## What to change

1. **Which items matter.** New `meetingItemsThatMatter(world, playerId, meetingDueItemId)` in `local-council-meetings.ts`, returning each agenda item with the record reasons it matters (any one is enough; no score, no threshold): (a) the player sponsors it or amended it; (b) it answers a question the player took a stand on (`stateCampaignStand`) or a reply they gave in a scene; (c) someone the player knows contacted them about it (b06 cases) or will speak on it; (d) a member's recorded public stance opposes it, or the player's own recorded view does; (e) its recorded effects reach someone in `peopleKnownTo(player)`. Everything else is a quiet item.
2. **Agenda before the meeting.** The day-before notice (`noticeMemberVote` pattern) lists the agenda with matters marked and a choice "sit through the whole meeting". The choice is per meeting; a standing default is a new optional field on the office workflow preference (`meetingDepth: "what-matters" | "everything"`).
3. **Play only those items.** Pass the matter list to Session 4's council situation as its `pending` input; quiet items are not beats. The played roll call writes the player's ballot through `recordMemberBallot` before the handler's vote runs.
4. **Quiet items follow the office's voting mode.** Extend `recordOfficeWorkflowPreference` and `office-onboarding.ts` to council seats (one path, no copy). `prior-instructions-with-exceptions`: a standing instruction casts it; none → the item joins the batch. `review-batch`: after the meeting the player gets one plain list of the quiet items (yea / nay / abstain each, or "same as the majority of my recorded votes on this question"); deciding writes ballots through `recordMemberBallot`; anything left undecided by the vote is recorded absent as today. `handle-individually`: every item plays (same as "everything").
5. **Summary in words.** After the meeting, the journal and the meeting minutes surface read the `local.council-meeting-held` event: each quiet item in one line through `composeGroundedLine` (what it does, the tally, the player's vote). No new summary writer.

## Must NOT build

- A second meeting scheduler or a second vote engine; council votes stay in `decideChamberVote`.
- An importance score or numeric cutoff; any vote cast for the player by the game's own judgment.
- Authored meeting dialogue, fixed agenda items, or a scripted "big vote".
- A meeting-only copy of the office voting modes.
- Changes to how NPC members file or vote (Session 21 owns vote considerations).

## Done when (proof in a played game)

- Random town, player seated on council: run three meetings. One has no matter → no scene, a short summary, the player's quiet votes handled per their mode. One has the player's own ordinance → plays as a scene with real speakers and a played roll call. One has an item a coworker called about → plays; the rest summarized.
- Same save with "sit through the whole meeting" → every item plays.
- Print, per item, the reasons it played or did not.
- Tests: `meeting-items-that-matter.test.ts` (each reason alone makes an item play; none → quiet; same world → same list), `office-workflow.test.ts` (council seat accepts all three modes; batch decisions write ballots; undecided stays absent), check that a played year produces no scene for a meeting with no matters.

## Depends on

Session 4 (council scene, roll call moment), Session 21 (vote considerations), b06 (constituent cases), Session 13 (seating), Session 14 (minutes/paper surface).

## Open questions for the owner

None.

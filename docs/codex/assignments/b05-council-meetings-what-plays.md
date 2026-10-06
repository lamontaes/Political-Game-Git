# B05 Council meetings: only what matters plays

Bank id b05 · Phase P1 (council journey) · Unlocks step 6: "negotiates, vote as a played moment" (the meeting is where the vote is played) and step 8 (people bring it up).
Code checked at origin/main 1ee0abcda.

## What the player experiences

Your council meets on its own recorded schedule (monthly in many small towns, twice a month or weekly in cities) but you do not sit through every line. Before a meeting you see the agenda. Items that matter to you or the town play as scenes: your own ordinance, something you promised voters, something people you know called you about, a question that splits the council, or one that reaches people in your life. People speak, members argue, and you vote as a played moment. Everything else is summarized in plain words afterward: what passed, by how much, how you voted. How quiet items get your vote is your call: decide them in one quick list after the meeting, leave standing instructions, or take every one yourself. You can always sit through the whole meeting. Many meetings have nothing that matters to you, and that is normal.

## Owner decisions it rests on

- "Meetings: only items that matter to you or the town play; rest summarized; player can choose to sit through more."
- "Scenes scale with responsibility; quiet days normal early." Pace: council about 15 to 30 minutes per in-game year.
- Things happen only when they matter. The player is never decided for. Zero dice. One rule for every place; one voting-mode path for all offices; delete what you replace.

## Existing code to extend (verified)

- `src/simulation/living-world/local-council-meetings.ts:534 localCouncilMeetingHandler`. On each meeting date it runs `moveOrdinances` (:266, the spec said :265) and `fileOrdinances` (:226), then writes `local.council-meeting-held` at :594 with a summary of every vote, and schedules the next meeting. The file header (:82) says the meeting interval is a PLACEHOLDER pending `local-council-legislative-volume`.
- `src/simulation/governing/council-lawmaking.ts:7-28` (not re-read in full by this draft): members file and vote from principles and voters; the player is never decided for, recorded absent.
- `src/simulation/governing/chamber-votes.ts:193 playerBallot`, `:865-881`: the player's seat casts `playerBallot` if present, else `absent` with reason `member:player-not-present`.
- `src/simulation/governing/member-ballots.ts:40 memberBallotOn`, `:63 recordMemberBallot`; `src/simulation/governing/legislative-clock.ts:1693 noticeMemberVote(world, measureId, voteOn)` schedules the day-before notice (only for `world.control.kind === "person"`).
- `src/simulation/office-workflow.ts:31 VOTING_MODES` (review-batch, prior-instructions-with-exceptions, handle-individually), `:158 recordOfficeWorkflowPreference`. At :153 and :182 it states "a legislative seat needs a voting workflow" and refuses otherwise: that refusal is the seam that blocks council seats today. `:236 recordOfficeVoteInstruction` (instructions are yea, nay, present-not-voting). Choices in `src/presentation/office-onboarding.ts:40 OFFICE_VOTING_CHOICES`.
- `src/simulation/campaign-stands.ts:104 stateCampaignStand`: the player's recorded pledges.
- `src/simulation/governing/constituent-views.ts:39 constituentsConsideration`; `src/simulation/provision-public-face.ts:89 whoCaresAbout` (the spec's path under governing/ is wrong).
- `src/simulation/living-world/civic-actions.ts:49-52` event names: contacted `life.contacted-official`, attended meeting.
- `src/simulation/living-world/official-views.ts:301 peopleKnownTo`.
- `src/simulation/ordinary-meeting-presence.ts:57 speakAtOrdinaryMeeting`, `:150 recordOrdinaryMeetingPresence`, `:244 enterOrdinaryMeeting`, `:264 ordinaryMeetingEntry`. The access and comment writers to keep. UI: `src/player/OrdinaryMeetingPanel.tsx` (being replaced by Session 4); `src/presentation/ordinary-meeting-scene.ts`, `ordinary-meeting-actions.ts`.
- Session 4's spec: on branch `origin/codex/session4-played-scene-spec`, file `docs/codex/specs/session4-played-scenes-2026-10-06.md` exists, but lines 111-166 as cited did not show a council row when sampled at 111-120 (it showed a general rule about scenes coming from live records). Codex must search the file for "council" and use what it finds. This is the caller's scene system; build to its "pending input" contract, not to a guessed one.
- Newer code covering part: none. `grep meetingDepth` returns nothing. Research request `what-a-town-council-member-does` (recommended answer: typical council work everywhere, marked typical) is open and is why meeting frequency and agenda content are placeholders.

## Build steps (each is one PR)

1. **Which items matter.** New `meetingItemsThatMatter(world, playerId, meetingDueItemId)` in `local-council-meetings.ts`. Returns each agenda item with its record reasons (any one is enough; no score, no threshold): (a) the player sponsors or amended it; (b) it answers a question the player took a stand on (`stateCampaignStand`) or answered in a scene; (c) someone the player knows contacted them about it (b06 cases) or will speak on it; (d) a member's recorded public stance opposes it, or the player's recorded view does; (e) its recorded effects reach someone in `peopleKnownTo(player)`. All else is quiet. Must NOT: a score or cutoff.
2. **Agenda before the meeting.** The `noticeMemberVote` pattern lists the agenda with matters marked and a choice "sit through the whole meeting" (per meeting). A standing default is a new optional field on the office workflow preference record (`meetingDepth: "what-matters" | "everything"`); extend the record type in `types.ts` and `recordOfficeWorkflowPreference`; migrate nothing (saves do not matter).
3. **Play only those items.** Hand the matter list to Session 4's council situation as its pending input; quiet items are not beats. The played roll call writes the player's ballot through `recordMemberBallot` before the handler's vote runs. Must NOT: a second vote engine; council votes stay in the chamber-vote decision.
4. **Quiet items follow the office's voting mode.** Extend `recordOfficeWorkflowPreference` and `office-onboarding.ts` to council seats (lift the "legislative seat" refusal; one path, no copy). `prior-instructions-with-exceptions`: a standing instruction casts it; none means the item joins the batch. `review-batch`: after the meeting one plain list of quiet items (yea / nay / abstain each, or "same as the majority of my recorded votes on this question"); deciding writes ballots through `recordMemberBallot`; undecided stays absent as today. `handle-individually`: every item plays.
5. **Summary in words.** After the meeting, the journal and minutes read the `local.council-meeting-held` event: each quiet item in one line through `composeGroundedLine` (what it does, the tally, the player's vote). No new summary writer.
6. **Replace the placeholder cadence (required, not optional).** The meeting interval is a data row per place: read from the place's recorded charter or council rules where the source data has it; otherwise the median interval of read places in the same government type and population band, marked estimated. No fixed 14-day constant anywhere (owner: nothing pinned to a number).

Replaces: any ordinary-meeting path that plays every agenda line, once Session 4's scene replaces `OrdinaryMeetingPanel.tsx` (do not delete the panel in this PR unless Session 4's scene has landed; Others may touch this file; work anyway; whoever merges second rebases; message the owning session directly with specific questions and keep building).

## Must not build

- A second meeting scheduler or vote engine.
- An importance score or numeric cutoff; any vote cast for the player by the game's own judgment.
- Authored meeting dialogue, fixed agenda items, a scripted big vote.
- A meeting-only copy of the office voting modes.
- Changes to how NPC members file or vote (Session 21 owns vote considerations).
- New screens beyond the agenda list and the after-meeting list the owner already described.

## Research tables

In repo: none give council cadence. `data/research/local-government/` (council election methods, county and township bodies) has no meeting schedules; `lawmaking-throughput/` is legislatures only. One web search found only examples, no national table:

| Place                        | Fact                                                                                                           | Source                                                                              |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 20 largest California cities | 90% meet weekly; Los Angeles three times a week, San Diego twice                                               | search result summary of a California study (legislative analyst report, sfbos.org) |
| Many smaller places          | twice monthly or less                                                                                          | same search; Lakeport and Angleton codes appeared                                   |
| ICMA                         | municipal form-of-government surveys cover council (Section 4) but meeting frequency tables were not reachable | icma.org                                                                            |

Rule: where a place's schedule is not read, take the median interval of read places in the same government type and population band, marked estimated. There is no fixed default; the band median is the estimate.

## Done when

Random town, player on council: run three meetings. One has no matter: no scene, a short summary, quiet votes handled per the player's mode. One has the player's own ordinance: plays as a scene with real speakers and a played roll call. One has an item a coworker called about: plays; the rest summarized. Same save with "sit through the whole meeting": every item plays. Print, per item, the reasons it played or not.
Tests: `meeting-items-that-matter.test.ts` (each reason alone makes an item play; none is quiet; same world same list); `office-workflow.test.ts` (a council seat accepts all three modes; batch decisions write ballots; undecided stays absent); a played-year check that a meeting with no matters yields no scene.

## Proof to post

Under `docs/codex/evidence/b05-meetings/`: screenshots of the agenda with matters marked, the played meeting, the after-meeting list, and the summary lines. Printed: per-item reason lists for three meetings, plus the same meeting under "everything".

## Standing rules

"NEVER STOP WORK WAITING ON THE OWNER. When a decision is open, build everything that does not depend on the answer, plus the switch for it: a data row, a setting, or one function with the options stubbed. Log the question in the docket and keep building."

Open owner questions named in this doc: none. Open items, each with its switch:

- Meeting cadence (research request still open): a data row `councilMeetingIntervalDays` per government type and size band, filled from the recorded schedule or the band median, marked estimated; the handler reads only it.
- Default depth for a new council seat: the setting `meetingDepth` ("what-matters" default, "everything"); the choice screen is a stub that writes it.
- If Session 4's council scene has not landed: build parts 1, 2, 4, 5 now; part 3 hands the matter list to a stubbed `playCouncilItems(items)` function that plays nothing and records quiet-style handling, replaced when Session 4 lands.

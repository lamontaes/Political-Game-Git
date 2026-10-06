# Shared blocks for scenes composed from live records

Before: The owner rejected all existing dialogue and the public meeting panel and its flow.

After: This proposed data-row specification composes played situations from actual place records, people, wants and pending state. Every line uses the existing English engine. Replies use her records. Three or four short played scenes from her actual history precede the first room.

Replaces: EVERY existing chat interface and its button-grid experience, including the meeting panel. Council and first-day work are worked examples of composable situations, not a finite scene list.

Next: Implement reusable blocks through existing engines under CTO ruling 6006639692, in its five-step order with a played random-town clip before the next block. The specification has passed CTO review; the previous spec-before-code hold is superseded. Presentation mockups still require the owner pick. No implementation or acceptance proof is claimed by this documentation checkpoint.

## Governing instructions

**NO BLACK BARS. NO FIXED TRIGGER LIST. NO NEW ENGINE.**

Measured instruction: [CTO correction 6006184070](https://github.com/lamontaes/Political-Game-Git/issues/2052#issuecomment-6006184070) strikes the earlier letterbox order. The owner's October 4 words govern: “I don't want the black bars on top and bottom”. Existing English, images and conversation records are reused.

Measured instruction: [CTO 6006227813](https://github.com/lamontaes/Political-Game-Git/issues/2052#issuecomment-6006227813) supplies four requirements. Live-place composition has no trigger list. Replies come from her knowledge, relationships, money and standing; Lie is always present. Situation content grows weekly toward hundreds. Three or four short played history scenes precede the first room. [Owner ruling 6006222661](https://github.com/lamontaes/Political-Game-Git/issues/2052#issuecomment-6006222661) supplies their intent.

Recovered October 4 owner text, chat `01a0feb5-0cc6-7b90-8c9a-e37db416d4eb`, turn `01a108d2-537f-7fb0-b554-eb5581af6ddd`:

> it needs to be chosen from/by the simulation
>
> the transition between palces/events are where these scenes happen. then the game wowrld with the normal ui comes up to interact. now it doesnt always happen. sometimes you travel to your office with nothing happEning
>
> Yes — include conversations among others
>
> Return to the room; offer more talk
>
> This is what I mean, is that it needs to be modular. Maybe you walk into something, and maybe sometimes you don't.

The subsequent black-bar instruction was corrected, not silently reconciled with these words. There are no black bars in the proposed experience.

## Superseding implementation ruling: five shared blocks

Measured instruction: [CTO 6006516319](https://github.com/lamontaes/Political-Game-Git/issues/2052#issuecomment-6006516319) records the owner's correction: “all at once. we are building blocks, not specific scenes. that's what the sim does. that's the entire project.” Implementation is now authorized. Council and work rows below are historical illustrations of evidence boundaries, not authored templates, delivery order, or the implementation unit.

1. **Live situation reader:** read the current place, actual pending state and recorded wants at the current moment. Quiet arrival remains valid. No fixed scene trigger list chooses an outcome.
2. **Recorded participants:** distinguish actual current presence from expected attendance. Only actual people may speak or appear; knowledge and hearing remain separate from presence.
3. **Existing English exchange:** compose supported beats and every line through the existing English engine. Reply meanings come from her lived record, relationships, knowledge, money and standing. Lie remains present. The same blocks serve different situations and players.
4. **Existing art:** select place art and person images from those same records through existing art selectors. No fabricated cast, new art engine, or black bars.
5. **Canonical writeback:** dispatch the existing validated action writers and retain actual words, meanings, listeners, consequences and source records. Reading a scene creates no event; scheduled intent does not masquerade as completed action.

Acceptance requires arrival in a random town and whatever the simulation composes, shown in a real-game screenshot and clip. Two different players must produce two different scenes through these same blocks. Fixed council/work templates, handpicked contrast records and a prose-only report cannot satisfy that proof. Exact file claims and producer/consumer handoffs must precede overlapping edits.

## Latest accepted implementation sequence

Measured instruction: [CTO 6006639692](https://github.com/lamontaes/Political-Game-Git/issues/2052#issuecomment-6006639692) marks this specification **PASS to code with conditions**. Its ordered clip gates supersede the all-at-once sequence above while retaining reusable blocks as the product. Implement situation reading, then participant selection, then exchange composition, then art selection, then writeback. Each block must run in play in a random town with a posted clip before work proceeds to the next.

The first consumer is Session 13's clerk. Coordinate Session 20's office-scoped dated guidance and central knowledge-writer ownership before overlapping edits. The existing-file plan is `story-scene-resolver.ts` / `story-scene-day.ts` for live situation projection, existing `recorded-room-presence.ts` and producer readers for participants, `english-composition.ts` / `grounded-english.ts` and canonical conversation adapters for exchanges, `play-scene-context.ts` / `person-visual.ts` / `life-scene-people.ts` for art, and the existing simulation event/knowledge/claim/contact writers for retention. These are intended integration boundaries, not a claim that each block is implemented. No parallel engine or store is introduced.

The acceptance proof requires two different characters arriving at the same place to produce different exchanges from the same primitives, with both clips posted. No authored situation bank beyond the 12 proposed primitives is allowed until the blocks run; weekly growth starts afterward. The Lie presentation ruling is scales tipping, upper right, size 34, red glow and white hover. No black bars.

## Shared data row: all four requirements

The following is proposed content structure, not a new runtime or implemented API. Existing episode/story-scene/conversation flow consumes rows and existing canonical writers commit actions. No second scheduler, person-decision engine, English engine or conversation store is introduced.

```yaml
situation:
  key: stable content key
  version: reviewed bank/content version
  context:
    place: actual location and arrival/activity evidence
    at: actual date, moment and history cutoff
    people: actual currently present people with role/presence evidence
    wants: those people's recorded wants and decision reasons
    pending: actual work, commitments, business and public matters
  compose:
    selection: existing simulation/person decisions from those live records
    combine: compatible contributions from multiple situation rows
    quiet: no supported action means no encounter; normal room returns
    trigger_list: none
  lines:
    renderer: composeGroundedLine for EVERY emitted line
    packet: actual facts, speaker/viewer, knowledge and source IDs
    voice: shared recorded speaker traits; no invented motive or fact
    images: existing images selected for actual place/people/action
  replies:
    sources: her knowledge, relationships, money and standing at this cutoff
    meaning: eligible actual action chosen by her, then worded by English
    lie: always present; existing claim/contradiction writers
    history: existing recorded conversation/history, never fabricated
  beats:
    sequence: supported interactions, not a compulsory scripted outcome
    environment: actual available affordances with access and action evidence
    others_talking: supported NPC actions and actual hearing boundaries
  writeback:
    actions: existing authority/time/event/knowledge/conversation writers
    retention: actual sources, chosen meaning, composed parts and stable keys
    return: normal actual room; offer more eligible talk
  growth:
    task: core composable situations, expanded every week toward hundreds
    completion: standing task; never a fixed list declared done
  history_opening:
    count: three or four short PLAYED scenes before the first room
    selection: actual simulated earlier-life episodes at their dated cutoff
    sources: historical place, people, actions and consequences
    interaction: supported environment/person interactions, not prose-only pages
    missing_sources: producer gap; no generic or invented history filler
```

There is no “arrive at office → always play scene X” rule. Arrival supplies context; live records decide whether there is a debate, introduction, work matter, another combination, or nothing. Wants and pending state must cite actual records. A seeded roll, visit count or first eligible row cannot choose what a person does.

The row offers meaningful actions that her records permit. Knowing something, having the money, holding authority or having a relationship are separate eligibility sources. A question does not establish its premise. Recorded personality affects voice and NPC decisions without choosing her reply for her.

Lie is always present, including when truthful replies are limited. It selects deliberately false speech through the existing claim semantics; it does not teach the listener that the claim is false. Actual contradiction evidence governs discovery. History remains available. During talking, unrelated room controls fade; portraits use small boxes and the current speaker is highlighted. These are experience requirements; exact composition and controls await mockups and the owner pick.

## Composition multiplication and the same situation for two characters

Proposed initial content target: **12 core situation primitives**, not 12 fixed scenes or completed content. They are introduction/recognition, ask/explain, offer/consent, task/handoff, disagreement/reasons, public contribution, rule/eligibility explanation, commitment/follow-through, refusal/constraint, correction/repair, observation/reaction, and departure/continuation. The simulation can combine them in any place where the actual records support them.

The multiplication is `12 primitives × live place variations × actual people's records/actions × her lived records/permitted replies`, filtered by real evidence and permissions. The owner's 10,000-combination aspiration is reached by that composition, not 10,000 authored scripts. No fabricated variation counts or claim of 10,000 measured combinations accompanies this specification.

The same **task/handoff contribution** reads differently for these two existing characters. This is a read-only illustration from the existing authored Run A/Demo fixture, not two natural-game runs. No new contrast records, packets or simulation run were created for the specification. Each column is a prospective controlled-character viewpoint over those existing records.

Inferred from reviewed fixture source: `src/simulation/demo.ts:522` records the first character's paid, directed community-services job with 32–40 weekly hours. The same fixture records the second character's unpaid, shared-authority repair-mentor job with 4–8 hours. These are actual authored fixture records, not personality or money guesses.

Inferred from reviewed fixture source: `src/presentation/run-a-fixture.ts:101` records the same office briefing with both people. Its participant meanings distinguish the first character preparing the briefing from the second reviewing it in person. The shared place and pending constituent-service matter stay the same.

| Same live situation input             | Character A: existing coordinator                        | Character B: existing mentor                                                |
| ------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------- |
| Source person                         | Existing `world.personOrder[0]`                          | Existing `world.personOrder[1]`                                             |
| Work source                           | `initial:work:<personId>:community-services`             | `initial:work:<personId>:volunteer-repair`                                  |
| Own lived work facts                  | Paid coordinator; directed work; 32–40 hours             | Unpaid repair mentor; shared authority; 4–8 hours                           |
| Own briefing evidence                 | Actual participant action: prepared briefing             | Actual participant action: reviewed briefing in person                      |
| Record-permitted contribution meaning | Describe own prepared briefing and coordination role     | Describe own review and bounded mentor role                                 |
| English variation                     | Compose A's supported meaning and voice from A's records | Compose B's different supported meaning and voice from B's records          |
| Forbidden inference                   | No invented request details, money balance or experience | No borrowed coordinator authority, briefing authorship or private knowledge |

Actual opaque record IDs must be resolved from those saved stable keys when consumed. The proposed bank composes the different meanings; this table is not fixed spoken dialogue. Other place business, actual relationships, resources, standing and speaker traits can further vary the same situation. No uninspected money balance or invented contrasting personality is claimed here. Natural-world comparison remains an implementation proof requirement.

## Worked row 1: council contributions at the live meeting place

```yaml
key: council.contributions
version: proposed-1
context:
  place: actual reached council room and accessible meeting activity
  people: actual present chair, members, player and other recorded attendees
  wants: recorded positions, principles, relationships and decision reasons
  pending: actual agenda, proposals, speaking opportunities and vote state
compose:
  use: only contributions authorized by that live state
  combine: procedural business, member concerns and eligible player interaction
  do_not: fill seats, invent ballots, force every member to speak
beats:
  - key: scene-entry
    lines: council.arrival; surface=scene
    facts: actual arrival/place and visible recorded people
    writes: presentation only; reuse actual travel/arrival
  - key: chair-opening
    condition: actual current chair has an authorized opening action
    lines: council.chair-opening; surface=dialogue
    facts: chair's known agenda, current role and recorded traits
    writes: actual utterance and actual listener knowledge
  - key: member-contributions
    condition: a present member has a supported speaking action
    lines: council.member-contribution; surface=dialogue
    facts: that member's own records/knowledge and reasons
    writes: actual utterance and hearing; omit unsupported contributions
  - key: public-comment
    condition: current meeting authority/state permits comment
    action: player chooses whether and what to say, taking comment position
    lines: council.player-comment; surface=dialogue
    facts: her chosen meaning, eligible records and actual recipients
    writes: one canonical public comment, English parts and direct hearing
  - key: roll-call
    condition: actual canonical progression reaches the recorded vote
    lines: council.roll-call; surface=dialogue
    facts: actual dispositions and source decision/vote records
    writes: existing due vote progression only; never a duplicate vote
  - key: room-return
    lines: council.return; surface=scene
    facts: actual resulting location, elapsed time and outcome
    writes: actual chosen departure/time writer; otherwise presentation only
  - key: journal
    lines: council.journal; surface=journal
    facts: actual events the player observed or knows
    writes: existing knowledge/journal path once
return: normal actual room, with more talk only to eligible present people
```

Each line identifier is a proposed new reviewed bank key, not fixed spoken text. Every line, including environmental descriptions and menu choices, calls `composeGroundedLine`. No old fixed reply is reused to complete a beat. Required missing evidence is a producer gap, not permission to fill it with narration.

Chair and member speech follows actual authorized actions and their recorded causes. Conversations among others can be heard only through actual presence/hearing. Private knowledge does not become hers because it exists in the world. If a matching vote already exists, present the recorded roll call as a record; do not claim her comment newly caused it. If a vote is due, the existing canonical authority/person-decision/time path produces it. No vote record means no invented ballots or result.

Agenda and room interaction use actual accessible affordances. Reading does not earn attendance credit. A private/direct conversation and a public comment retain their different listeners and writeback. Leaving early uses the actual return route and does not grant full attendance.

## Worked row 2: first-day work contributions at the live workplace

```yaml
key: work.first-day-contributions
version: proposed-1
context:
  place: actual arrival, current job/role, employer and workplace evidence
  people: actual workers at this employer/place who are currently present
  wants: their recorded work/relationship intentions and decision reasons
  pending: actual first-day duties, ongoing business and available work
compose:
  first_day: requires actual first-day evidence, not a new screen or visit
  combine: introduction, coworkers talking, work matter, environmental action
  quiet: unsupported encounter omitted; normal workplace room still available
beats:
  - key: scene-entry
    lines: work.arrival; surface=scene
    facts: actual job/employer/place, arrival and present workers
    writes: presentation only; reuse actual arrival
  - key: workplace-moment
    condition: actual business or a worker's supported action warrants it
    lines: work.observed-moment; surface=scene|dialogue
    facts: real pending matter and actual speakers' knowledge/recorded traits
    writes: only actual utterances and observation/hearing
  - key: introduction
    condition: an actual present worker chooses an authorized introduction
    lines: work.introduction; surface=dialogue
    facts: actual identity/role and recipient; no invented supervisor
    writes: existing spoken exchange and direct knowledge
  - key: player-interaction
    action: eligible response or inspect/use an actual work affordance
    lines: work.response; surface=dialogue|menu
    facts: her knowledge, relationships, money and standing for this action
    writes: existing conversation/conduct or actual work-action writer
  - key: room-return
    lines: work.return; surface=scene
    facts: actual workplace and people still present
    writes: presentation only; no automatic completed shift
  - key: journal
    lines: work.journal; surface=journal
    facts: actual arrival/exchange/work action and knowledge IDs
    writes: existing knowledge/journal path once
return: normal workplace room, with actual environment/work/talk actions
```

Only actual workers there may populate this workplace. Jobs, employer/place association, shifts, arrival/departure evidence, life status and the cutoff govern presence. Sharing an office picture is insufficient. A real first day does not require a greeting; ordinary commutes may also have no encounter. A day-one life opening is never forced into employment to fit this example.

Environmental actions require actual affordance/access evidence and their existing consequence writers. Do not invent an assignment, document or goal to provide a button. Inspection does not complete work. Actual mutual exchange can earn contact through the existing writer; merely entering or watching others cannot create friendship or follow-through.

## Room offer, arrival and office-specific filing contributions

Measured instruction: [CTO 6006310149](https://github.com/lamontaes/Political-Game-Git/issues/2052#issuecomment-6006310149) removes EVERY chat interface and its button grids. An actual event offer belongs on the room itself; travel/arrival leads into the played scene. There is no required detour through Politics/Campaigns and no revived old chat panel.

The room offer uses the actual event/activity, accessible route and current permission. Accepting a scheduled offer records scheduling, not a performed promise or completed attendance. The existing time runner reaches the actual event boundary; an unrelated morning stop cannot substitute for an evening destination. Arrival supplies the live place context and is presented as the scene, with meaningful environmental interaction even when no encounter is selected.

Filing explanation composes the **rule/eligibility explanation** primitive into the same live-place process. It uses the office she actually asks about, the dated qualification assessment and actual receiving official/office. These are additional contributions, not a fixed clerk trigger or a third new engine.

```yaml
contribution: rule.eligibility-explanation
context:
  office: actual requested office/family/jurisdiction and election cycle
  at: governing assessment date and temporal applicability
  speaker: actual present knowledgeable organizer or working clerk
facts:
  age: actual office-specific age rule and qualification assessment
  residency: actual applicable tenure/district/citizenship assessments
  window: office-specific filing interval with source or modeled status
  fee: applicable fee/alternative and source/model status
  receiver: actual receiving office and authorized clerk/work records
  caveats: unknown, estimated and historical applicability retained
lines:
  compose: composeGroundedLine from these substantive assessed facts
  prohibit: empty Let's-check replies, copied federal/local deadlines
writeback:
  speech: actual utterance, composed parts and correct listeners
  knowledge: actual facts learned by her with their source/assessment references
  reuse: character record, journal and later clerk scene
```

For the observed 19-year-old asking about Nevada Governor, the required explanation must say the minimum age **25** in words, using the admitted, applicable dated assessment. A dead gray button is not an explanation. Other requirements, their date criterion and her eligibility come from the office-scoped assessment; age alone cannot prove qualification.

Facts become hers through an actual informative exchange or legitimate inspection and the existing knowledge writer. Reading a date convenience function does not make her know the rule. Later journal/clerk composition consumes those retained actual facts. If a present speaker lacks the knowledge/source, the producer must supply it through a legitimate existing path; the scene cannot give the speaker omniscience.

Inferred from the source handoff: [Session 13 packet 6006313858](https://github.com/lamontaes/Political-Game-Git/issues/2052#issuecomment-6006313858) retains the following actual reader contracts. Consumers preserve full blocks, dated source assessments and estimates; they do not substitute inferred deadlines.

| Existing reader                 | Contract retained                                                    |
| ------------------------------- | -------------------------------------------------------------------- |
| `candidacyEligibility`          | Full qualification blocks and assessments.                           |
| `officeQualifications`          | Office-family rules with temporal applicability.                     |
| `candidateQualificationRuleSet` | Dated rule set or missing-set result.                                |
| `nominationPlan`                | Filing basis and estimated parts kept distinct.                      |
| `availableCampaignElectionDate` | Convenience date/null; insufficient researched-law provenance alone. |

Measured source inventory: [Session 20 packet 6006365732](https://github.com/lamontaes/Political-Game-Git/issues/2052#issuecomment-6006365732) identifies primary research for Nevada Governor age 25 and two-year citizenship/state residence. It explicitly does not claim an already installed Governor rule set in the current candidate-qualification reader. Source admission and the temporal premise remain prerequisites, not changes made by this specification.

Session 13 chooses the actual data admission route. The proposed source/compiler inputs are `data/source/state-office-qualifications/corpus.json` and its manifest; generated rule files are not manually edited. Each admitted field retains office/jurisdiction, value/status, authority, validity interval or uncertainty, observation/retrieval distinction, and actual source artifact/locator/hash.

The existing filing data is `data/research/elections/party-nomination-rules-2026.json`. The packet requires office-specific opening/closing dates, fee/waiver or alternative, and receiving office evidence, each with sourced/modeled/unknown status. That current filing table does not by itself supply all these fields or an actual clerk's presence.

Measured scope correction: [6006369286](https://github.com/lamontaes/Political-Game-Git/issues/2052#issuecomment-6006369286) identifies March 13 from the FEC congressional table and an other-office inference. Nevada Governor's deadline remains unknown unless its own source or clearly labeled modeled drift establishes it. The congressional date cannot become verified Governor law through a generic reader.

Session 13 owns the eligibility/calendar implementation and held clerk consumer. The substantive-answer seam identified by the packet is `src/presentation/candidate-guidance-scene.ts:270`. Its actual turn/knowledge write must retain the office-scoped fields and assessment references, not an empty “Let's check” response.

Proposed retention uses the existing canonical turn/event and knowledge path, with structured office/fact/status/source metadata and the actual speaker/listener. Journal and clerk readers consume that retained meaning; they do not parse English back into legal facts. This narrow field handoff requires agreement with Session 13 before code, and does not introduce a new fact store or invent assessment IDs.

## Three or four played history scenes before the first room

The simulation selects three or four short episodes from her actual simulated history. Home, school, a first shift or someone she will see again are possible source circumstances, not a required sequence or trigger list. Selection uses dated causes, people, wants, pending state and recorded significance; current-world biography cannot be copied backward without its historical cutoff.

Each selected episode uses the same row structure: historical place, actual people, supported actions, English packets, environmental/person interaction, retained sources and return. They are played scenes, not summary paragraphs or a sequence of Continue buttons. Historical participants do not become current room occupants.

Historical playback retains the actual episode's canonical outcomes and completed actions. It cannot append a new past event, alter her biography or award current contact simply to make a replay interactive. A qualifying producer episode must support actual playable interactions and sourced meaning; lacking those records is an earlier-life producer gap. No generic exchange or invented memory can substitute for the required three or four episodes.

## Exact producer and consumer handoffs

Inferred from reviewed implementation: `src/simulation/ordinary-meeting-presence.ts:264` validates current meeting access, actual arrival, place and time. The authority/presence safeguards survive the rejected panel's removal.

Inferred from reviewed implementation: `src/presentation/story-scene-resolver.ts:280` exposes actual meeting options with evidence and a current snapshot. New content must revalidate the current snapshot at commit; the old presentation is not accepted.

Inferred from reviewed implementation: `src/simulation/ordinary-meeting-presence.ts:57` writes the actual public comment and listeners. Its fixed-word selection is a replacement seam after review, while the existing canonical writer and knowledge path remain.

Inferred from reviewed implementation: `src/simulation/life-sources.ts:19` resolves typed earlier-life source references. Session 6 supplies actual dated episodes/people/place/action evidence; Session 7 consumes those records for three or four played opening scenes. This specification does not claim a new historical-episode API already exists.

Inferred from reviewed implementation: `src/simulation/life-queries.ts:505` reads active recorded work relationships. Session 8 coordinates actual workplace arrival, current-worker presence and environmental-action evidence. The scene consumer cannot create a coworker or infer their presence from an old job alone.

Inferred from reviewed implementation: `src/presentation/spoken-exchange.ts:14` is an existing utterance/knowledge writer. Session 4 owns the semantic packet, chosen meaning and retained English parts handoff to the correct existing conversation/comment writer. Actual listeners and source IDs remain explicit.

Inferred from reviewed implementation: `src/presentation/grounded-english.ts:32` separates facts, speaker/viewer, knowledge, moment and bank version. The existing `composeGroundedLine` realizes that packet; shared recorded speaker traits are reused rather than replaced by a prose personality engine.

The proposed producer payload contains actual record references for place/time, present people/roles, wants/reasons, pending matters, available actions and each fact's speaker/viewer knowledge. Historical payloads also include their dated cutoff and completed canonical episode outcomes. These are required handoff fields, not invented function names. Consumers request the actual producer head/API before implementation.

Session 3 owns the selected scene/image/portrait consumer; Sessions 2/3/14 do mockups only until owner pick. Session 13's clerk scene waits for this specification check. Session 4 does not write their registration/layout hunks or a new engine.

## Persistence and removal boundaries

Retain the row/content version, actual source IDs, selected semantic action, composed text/parts/variant keys and canonical stable keys through the existing saved records. Reopening or reloading cannot repeat a journey cost, utterance, knowledge award, contact, vote or journal write. Historical words remain tied to their own episode and cutoff.

Presentation and canonical actions are separate. Rendering, highlighting, fading controls and inspecting a surface cannot move the clock, grant consent, mark attendance or change a relationship. Return to the normal room projects the world after actual actions and offers more talk only if currently eligible. No goal UI is added.

Replacement targets after approval: EVERY existing chat interface, its button grids and component-specific flow/styles/tests. This includes the meeting panel, hardcoded opening selection and fixed meeting speech/agenda presentation. “Put your name in” and “Ask for something” grids are removed, not polished. The canonical authority, time, event, knowledge and decision writers survive. A narrow literal-count audit found no verified player/presentation “8/8” scene counter; its owning reference remains to be identified rather than deleting unrelated numeric data.

The existing chat surfaces include SceneConversation, ConversationStrip, OrdinaryMeetingPanel, CandidateGuidancePanel and PressInterviewPanel. Their interfaces are replacement targets, including their entry points in opening/campaign/workspace flows. Session 3 coordinates the selected consumer with the relevant owners; this documentation claims no overlapping implementation hunks.

## Standing content task and proof

Begin with the proposed 12 core situation primitives and expand it every week toward hundreds. Each addition brings fact requirements, meaningful record-permitted replies, image/pose needs, knowledge/privacy boundaries and writeback checks. Compose compatible situations from live state. Reliable new combinations are the continuing goal; a finite list is never completion.

After CTO specification check and owner mockup pick, actual-game proof draws a place from all 56 and names the seed. Council proof shows supported real speakers, chosen comment, canonical roll call/outcome, normal-room return and retained journal/knowledge records. Work proof shows actual first-day cause, actual workers, meaningful exchange/environmental action, earned contact where applicable and a quiet transition when nothing happens. Opening proof plays three or four real historical episodes before the first room without fabricating earlier events or current occupants.

Measured status: This is documentation only. No scene code, new dialogue banks, new engine or mockup has been built. Drafts #2207 and #2220 remain unchanged and unmerged. Expanded run 63137 ended 18 PASS/13 FAIL; canceled baseline 65055 exited 143 without a completed result. Those receipts are preserved, not pursued as replacement acceptance. No READY is claimed.

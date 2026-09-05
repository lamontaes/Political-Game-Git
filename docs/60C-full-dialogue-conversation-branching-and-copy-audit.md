# 60C — FULL DIALOGUE, CONVERSATION, BRANCHING AND COPY AUDIT

## OUR CIVIC DUTY — PRINT EDITION

**Prepared for:** Lamontae Billing
**Date:** 2026-09-04
**Measured against:** accepted main `6311dd6` plus the open unmerged wave branch
`claude/pr81-narrative-graphics-lifeflow-t8j8oe` (PR #87, draft)
**Companion documents:** 60A (completion report), 60B (visual audit), 60D (systems field guide)

---

## HOW TO READ THIS DOCUMENT

The same five state labels used throughout this omnibus apply here:

| Label                | Meaning                                                                               |
| -------------------- | ------------------------------------------------------------------------------------- |
| **[MAIN-PLAYABLE]**  | On accepted main `6311dd6`; a player meets it in ordinary play.                       |
| **[MAIN-SUBSTRATE]** | Merged and working, but reachable only via a `?view=` route, a CLI script, or a test. |
| **[OPEN-PR #n]**     | Implemented on an open, unmerged pull request. **Not shipped.**                       |
| **[BANKED]**         | Authored/research content exists; no runtime consumes it.                             |
| **[MISSING]**        | No code, no content.                                                                  |

**Terminology.** This project has _four different things_ that could all be
called "dialogue", and conflating them is the main reason the system is hard to
reason about. Throughout this document:

- **A conversation** means the turn-based engine in
  `src/presentation/run-b-conversation.ts` — subjects, intents, addressees,
  audibility, listeners, claims, knowledge, perceptions. This is the only thing
  in the game that is a _dialogue system_ in the usual sense.
- **A situation** means an authored beat with a prompt and 2–4 choices
  (`character-history.ts` formative bank, `adult-situations.ts` adult bank).
  Nobody speaks in turns; the player chooses once and the beat closes.
- **An episode stage** means one step of a multi-stage authored family
  (`episode-bank.ts`) that can continue across months or years.
- **A calibration item** means one setup question
  (`setup-questionnaire-bank.ts`, `setup-opening-bank.ts`).

All four produce player-facing prose. Only the first branches within itself.

---

# PART 1 — THE ARCHITECTURE

## 1.1 The conversation engine at a glance

```
   PLAYER picks an INTENT, an ADDRESSEE and an AUDIBILITY
              |
              v
   availableConversationIntents(world, room, addressee, progress, audibility)
              |   rejects anything the SUBJECT is not currently offering
              v
   commitConversationTurn(world, input)
              |
              +--> validateConversationRoom / Session / Addressee
              +--> rejectDuplicateTurn(turnKey)
              +--> resolveConversationListeners(room, addressee, audibility)
              +--> resolveResponseSpeaker(...)
              |
              v
   resolveNpcResponse(...)  -- one of six responders, see 1.5
              |
              v
   WRITES, in this fixed order:
     1. recordWorldEvent      (always)
     2. recordClaim           (when an NPC actually said something)
     3. recordEventKnowledge  (presence: one per participant)
     4. recordEventKnowledge  (claim: one per listener who is not the speaker)
     5. recordPerception      (one per listener who is not the speaker)
     6. recordRelationshipInteraction  (only for `reassure` and `press`)
              |
              v
   assertWorldIntegrity(world)  -- refuses to return a world it broke
```

**[MAIN-PLAYABLE]** for the machinery; see Part 2 for what a player can actually
reach.

## 1.2 The vocabulary

**Subjects — 5** (`conversationSubjectKeys()`):

```
  shared-intake-checklist              a constituent referral, in an office
  transit-access-pilot-provision       a bill provision, with a briefing lead
  household-obligation                 who does the week's errands, at home
  school-project-share                 who does which half, at school
  neighborhood-meeting-notice          a notice about a local meeting
```

**Intents — 15** (`RUN_B_CONVERSATION_INTENTS`):

```
  ENGINE-LEVEL     listen
  OFFICE           request-commitment   reassure   press
  LEGISLATIVE      discuss-provision
  HOUSEHOLD        raise-obligation   offer-to-cover   ask-to-share   ask-for-time
  SCHOOL           raise-share   offer-to-do-more   ask-to-split
  NEIGHBORHOOD     mention-meeting   say-you-will-go   ask-them-to-go
```

**An important architectural note.** `ConversationIntent` is `string`, not a
closed union. The module documents why, and the reasoning is sound:

> _"This was a closed union naming every intent in the game, which meant adding a
> conversation about anything required editing the engine — and made a subject's
> own vocabulary something the centre had to approve. An intent is now an
> ordinary key, and it is checked at the only point where checking means
> anything: against the intents the subject in front of the player is actually
> offering, every turn, before the turn is committed."_

`RUN_B_CONVERSATION_INTENTS` is retained as the shipped list for tests and
tooling only. **Adding a sixth subject requires no engine change.** That is the
single best property of this system and the reason the content-expansion rules
in Part 7 are achievable.

**Audibility — 3** (`RUN_B_AUDIBILITY_OPTIONS`): `normal`, `quiet`, `private`.

## 1.3 How audibility actually resolves listeners

`resolveConversationListeners(room, addressee, audibility)`:

```
  normal   ->  room.normalHearingPersonIds
  quiet    ->  addressee(s) + room.quietAmbientHearingPersonIds
  private  ->  addressee(s) only
               ... and throws if !room.privateAvailable, using
                   room.privateUnavailableReason as the message
```

The player is always removed from the listener list. `canonicalPeople()`
deduplicates and orders. `private` is genuinely private: no third party gets
knowledge, a perception, or a claim.

**This is real, tested, and correct.** It is also, in the shipped game,
**unreachable** — see 2.2.

## 1.4 What one turn writes, field by field

This is the complete list of named fields written by `commitConversationTurn`.
It is here because 60D's causal chapters and any future causal-inspector work
depend on knowing exactly which fields exist.

**Event** (`recordWorldEvent`):

```
  stableKey            `${sessionKey}:turn:${n}:event`
  type                 commit.eventType          <- from the SUBJECT's contract
  occurredAt           world.currentDate
  recordedAt           world.currentDate
  jurisdictionId       room.jurisdictionId
  involvedEntityIds    participants + jurisdiction + subject entities
  participants[]       { personId, role, detail }
      role is one of:
        agency:initiator        the player, when they spoke
        presence:participant    the player, when they listened
        focus:respondent        the NPC who answered
        focus:addressee         an NPC who was addressed but did not answer
        observation:listener    an NPC who was nearby and heard
  visibility           "private" when audibility==="private", else "limited"
  tags[]               commit.contextTag
                       `conversation.intent.${intent}`
                       `conversation.audibility.${audibility}`
                       commit.subjectTag
  summary              conversationEventSummary(...)
  context.location     { jurisdictionId, label, setting }
  context.socialContext  from the subject contract
  context.pressure       commit.pressure(intent)
  context.choice         commit.choice(intent, { addresseeName, named })
  context.motivation     commit.motivation
  context.immediateReaction   the NPC's line, or
                              "The room settled briefly; no participant
                               added another claim."
```

**Claim** (`recordClaim`), written only when an NPC produced a line:

```
  stableKey            `${turnKey}:claim`
  speakerPersonId      the responding NPC
  eventId              the event just written
  madeAt               world.currentDate
  audience             "private" | "limited"
  statement            the NPC's exact line
  relationshipToTruth  "unknown"        <- always; see finding D-06
  provenance           { kind: "direct-record" }
```

**Presence knowledge** (`recordEventKnowledge`), one per participant:

```
  stableKey        `${turnKey}:knowledge:presence:${personId}`
  believedSummary  the event summary
  accuracy         "accurate"
  confidence       "high"
  source           { kind: "direct" }
```

**Claim knowledge** (`recordEventKnowledge`), one per listener ≠ speaker:

```
  stableKey        `${turnKey}:knowledge:claim:${personId}`
  believedSummary  `${speakerName} said: ${dialogue}`
  accuracy         "unknown"          <- correctly NOT "accurate"
  confidence       "high"
  source           { kind: "told-by", sourcePersonId, claimId }
```

**Perception** (`recordPerception`), one per listener ≠ speaker:

```
  stableKey            `${turnKey}:perception:${personId}`
  subjectKind          "entity:conversation-position"
  subjectKey           `conversation-response:${speakerPersonId}`
  subjectEntityId      the speaker
  assertion            the responder's authored perception sentence
  confidence           "medium"
  sourceCredibility    "medium"
  source               { kind: "heard-claim", claimId, knowledgeId }
  supersedesPerceptionId  null          <- always; see finding D-07
```

**Relationship interaction** (`recordRelationshipInteraction`), only for
`reassure` and `press`:

```
  stableKey       `${turnKey}:relationship`
  personIds       canonicalPair(player, speaker)
  kind            commit.interactionKind(consequence)
  change          "strengthened" | "strained"
  significance    "meaningful"           <- always
  summary         an authored sentence naming both people
  tags            commit.interactionTags
```

## 1.5 The six responders, and the decision gap

`resolveNpcResponse` dispatches to one of six paths:

| Responder                                           | Subject              | NPC decides?                                                            | `durableDecisionRecorded` |
| --------------------------------------------------- | -------------------- | ----------------------------------------------------------------------- | ------------------------- |
| `resolveLegislativeProvisionResponse`               | transit provision    | no — reads knowledge, then fixed lines                                  | `false`                   |
| `resolveNeighborhoodMeetingResponse`                | neighborhood meeting | no — `switch (intent)`                                                  | `false`                   |
| `resolveHouseholdObligationResponse`                | household obligation | no — `switch (intent)`                                                  | `false`                   |
| `resolveSchoolProjectResponse`                      | school project       | no — `switch (intent)`                                                  | `false`                   |
| `resolvePendingConversationContribution`            | any, on `listen`     | no                                                                      | `false`                   |
| **the office path** (`request-commitment`, `press`) | intake checklist     | **yes** — `evaluateConversationDecision` + `recordDurableDecisionTrace` | **`true`**                |
| `resolveQuietRoom`                                  | any, silence         | n/a                                                                     | `false`                   |

**FINDING D-01 — the central dialogue finding of this audit. [MAIN-PLAYABLE]**

> Of the five conversation subjects, **exactly one** — `shared-intake-checklist`
> — and within it exactly two intents — `request-commitment` and `press` — cause
> an NPC to _actually decide anything_. Those two paths call
> `assertNpcAutonomousApplication`, run `evaluateConversationDecision`, and write
> a durable decision trace, so the NPC's answer is a function of the NPC's own
> recorded state and can differ between two players who said the same thing.
>
> Every other conversation in the game is a lookup table. The household, school
> and neighborhood responders are flat `switch (intent)` blocks returning a
> hard-coded string. The same input always produces the same output, forever,
> regardless of who the NPC is, what they believe, what the player has done to
> them, or what has happened in the world.

Concretely, `resolveHouseholdObligationResponse` in full for one intent:

```ts
case "offer-to-cover":
  return {
    world,
    outcome: "reassured",
    speakerPersonId: input.speakerPersonId,
    dialogue: `"Then I owe you one," ${shortName} says. "I mean that."`,
    perception: `${personName(speaker)} accepted the offer and said it counted.`,
    durableDecisionRecorded: false,
  };
```

The only thing that varies is the person's family name. The line "Then I owe you
one" is returned whether the player has covered for them nine times or never,
and whether the relationship record says strengthened or strained.

**FINDING D-02 — relationship consequences are a two-entry table. [MAIN-PLAYABLE]**

```ts
function relationshipConsequenceFor(intent) {
  if (intent === "reassure") return "strengthened";
  if (intent === "press") return "strained";
  return null;
}
```

Thirteen of the fifteen intents can never change a relationship, including
`offer-to-cover` (which is literally an offer to take on someone's burden) and
`ask-to-split` (which is a negotiation about fairness). Reassure/press are office
intents, so **in the shipped game, no conversation the player can reach can
change a relationship at all.**

---

# PART 2 — WHAT IS ACTUALLY REACHABLE

## 2.1 The reachability table

| Subject                          | Reachable in shipped play? | Where                                                         |
| -------------------------------- | -------------------------- | ------------------------------------------------------------- |
| `household-obligation`           | **YES**                    | `HouseholdConversation` in `PlayerGame.tsx:1541`              |
| `shared-intake-checklist`        | no                         | `ConversationStrip` → `PlayerOffice` → `?view=office-fixture` |
| `transit-access-pilot-provision` | no                         | same                                                          |
| `school-project-share`           | no                         | same                                                          |
| `neighborhood-meeting-notice`    | no                         | same                                                          |

**[MAIN-PLAYABLE]**: one subject. **[MAIN-SUBSTRATE]**: four subjects.

## 2.2 What the production conversation surface hard-codes

`HouseholdConversation` (`PlayerGame.tsx:1541-1649`) is the whole of the
player-reachable dialogue system. Three of the engine's most interesting
parameters are constants there:

```tsx
const addressee = room.eligibleAddresseePersonIds[0]!; // always the first person
// ...
commitConversationTurn(session.world, {
  // ...
  addressee,
  audibility: "normal", // <-- HARD-CODED
  intent: option.key,
});
```

**FINDING D-03 — audibility is unreachable. [MAIN-PLAYABLE]**
The three-way audibility control exists as a segmented control in
`ConversationStrip.tsx`, on the development route. In the shipped game,
`audibility` is the string literal `"normal"`. So:

- `quiet` — never used. `quietAmbientHearingPersonIds` is dead in production.
- `private` — never used. `privateAvailable` / `privateUnavailableReason` are
  dead in production. **The `visibility: "private"` event branch is unreachable.**

This is the single largest reachability gap in the dialogue system: a fully
built, fully tested social-audibility model with no control attached to it.

**FINDING D-04 — "everyone" is unreachable. [MAIN-PLAYABLE]**
`ConversationAddressee` is `EntityId | "everyone"`, and the engine has a whole
`groupAddressed` code path with distinct lines. Production always passes
`eligibleAddresseePersonIds[0]`. Addressing the room is unreachable.

**FINDING D-05 — only the first eligible person can be spoken to. [MAIN-PLAYABLE]**
Even one-to-one, the player cannot choose _which_ person. If a household has
three people in it, the player always talks to the same one.

## 2.3 The two "always" fields

**FINDING D-06 — every claim is `relationshipToTruth: "unknown"`. [MAIN-PLAYABLE]**
The claim record supports a truth relationship; the conversation engine always
writes `"unknown"`. That is defensible for a system with no lying NPCs, but it
means the claim field carries no information today, and any future "somebody
lied to you" content has to start by using it.

**FINDING D-07 — no perception ever supersedes another. [MAIN-PLAYABLE]**
`supersedesPerceptionId: null` is hard-coded. So an NPC who is perceived as
"holding a boundary" in turn 2 and "agreed to a narrow next step" in turn 5
accumulates two live, contradictory perceptions rather than one revised one.
The field exists precisely to express revision; nothing uses it.

---

# PART 3 — COMPLETE DIALOGUE-PATH INVENTORY

## 3.1 Conversation paths (the turn engine)

| #   | Subject                          | Intents offered                                                      | Responder                             | Decides?         | Reachable |
| --- | -------------------------------- | -------------------------------------------------------------------- | ------------------------------------- | ---------------- | --------- |
| 1   | `shared-intake-checklist`        | request-commitment, reassure, press, listen                          | office path                           | **yes** (2 of 4) | dev only  |
| 2   | `transit-access-pilot-provision` | discuss-provision, listen                                            | `resolveLegislativeProvisionResponse` | no               | dev only  |
| 3   | `household-obligation`           | raise-obligation, offer-to-cover, ask-to-share, ask-for-time, listen | `resolveHouseholdObligationResponse`  | no               | **PLAY**  |
| 4   | `school-project-share`           | raise-share, offer-to-do-more, ask-to-split, listen                  | `resolveSchoolProjectResponse`        | no               | dev only  |
| 5   | `neighborhood-meeting-notice`    | mention-meeting, say-you-will-go, ask-them-to-go, listen             | `resolveNeighborhoodMeetingResponse`  | no               | dev only  |

## 3.2 Authored choice content (the four banks)

Exact counts, read from the modules themselves rather than estimated:

```
  EPISODE BANK        pg-episode-bank-v1
      families ......................  9
      stages ........................ 32
      options ....................... 87
      families with branching ....... 7 of 9
      families with a quiet ending .. 4 of 9

  ADULT SITUATION BANK
      situations .................... 35
      options ...................... 102
      stakes: ordinary 10 / notable 15 / pressing 10

  FORMATIVE SITUATION BANK
      situations .................... 19
      options ....................... 49

  SETUP / CALIBRATION BANK   pg-setup-bank-v4
      items ......................... 53   (26 legacy + 27 opening)
      options ...................... 198
      registers ..................... 6
      transparency verdicts:
          non-transparent ................ 36
          policy-docket-flagged .......... 15
          playtest-abstraction-flagged .... 2
                                        ----
  TOTAL AUTHORED PLAYER-FACING OPTIONS ... 436
  TOTAL AUTHORED BEATS ................... 139  (32 + 35 + 19 + 53)
```

## 3.3 The nine episode families, stage by stage

Every branch point in the shipped multi-stage content, in full:

```
  home.someone-is-not-all-right                              5 stages / 14 options
    noticing ......................... ask | tell-someone | watch | cover
    asked-directly ................... give | conditions | refuse
    kept-quiet-and-it-continued ...... say-it-now | keep-watching
    it-got-worse ..................... go | handle-it | stay-back
    it-steadied ...................... name-it | let-it-lie

  political.what-your-name-is-for                            5 stages / 13 options
    the-approach ..................... meet | decline | conditions
    the-ask .......................... sign | own-letter | refuse
    what-it-cost ..................... own-it | take-it-up | deflect
    nothing-came-of-it ............... fine | reopen
    kept-your-distance ............... reconsider | hold

  civic.the-thing-nobody-else-turned-up-for                  4 stages / 11 options
    the-meeting ...................... go | read-it | skip
    you-said-something ............... take-the-role | help-without-title | step-back
    the-issue-got-bigger ............. put-your-name | brief-someone | narrow-it
    it-wound-down .................... one-evening | no

  home.the-week-that-does-not-balance                        3 stages /  9 options
    the-first-time-it-is-said ........ take-it-on | explain | pay-for-it | later
    it-was-taken-seriously ........... swap | keep
    it-came-back-harder .............. change-something | concede-nothing | buy-time

  work.where-you-stand-there                                 3 stages /  9 options
    the-rule-and-the-person .......... apply-it | bend-it | escalate
    it-was-noticed ................... correct | after | leave-it
    the-offer ........................ take-it | decline | use-it

  growing-up.a-friend-over-years                             3 stages /  8 options
    the-year-you-were-inseparable .... go | stay | bring-them
    the-year-it-cooled ............... call | let-it-go
    still-there-later ................ yes | hear-it-out | no

  money.the-thing-you-are-behind-on                          3 stages /  8 options
    the-first-letter ................. call | pay-part | wait
    arrangement-held ................. clear-it | run-it-out
    it-got-further-behind ............ ask-someone | deal-with-it | challenge

  care.the-person-you-look-after                             3 stages /  8 options
    it-became-yours .................. say-it | carry-it | get-help
    shared-out ....................... answer | redirect
    it-stayed-yours .................. give-it-up | ask-now | both-badly

  school.the-thing-you-got-blamed-for                        3 stages /  7 options
    blamed ........................... name-them | take-it | deny
    it-stuck ......................... correct-it | let-it-stand
    it-came-out ...................... tell-it-again | drop-it
```

## 3.4 How an episode stage gates itself

`EpisodeRequirement` has **10 kinds**, and every satisfied one is preserved as a
separate `EpisodeCausalInput` with the records that answered it:

```
  fact               a named EpisodeFactKey holds (13 keys exist)
  absent             a named fact does NOT hold
  age-at-least       age >= n
  age-below          age < n
  role               a role can be bound (household-companion | relative |
                     familiar | colleague | community-member)
  after-stage        a named stage of THIS instance is already played
  without-stage      a named stage of this instance is NOT played
  after-choice       a named stage was played AND a named option chosen
  without-choice     a named stage was played and that option was NOT chosen
  days-since-stage   at least n days since a named stage
```

**This is the game's real branching grammar** — richer than anything the
conversation engine offers, because `after-choice` / `without-choice` let a
stage months later depend on the exact button pressed. **[OPEN-PR #87]**

---

# PART 4 — THE FIVE BRANCH DIAGRAMS

Each diagram traces one path through the fixed chain the addendum asks for:

```
  PLAYER/NPC ACTION -> LISTENERS -> CLAIM/KNOWLEDGE/PERCEPTION
                    -> NPC/RELATIONSHIP/COMMITMENT EFFECT
                    -> POSSIBLE LATER CALLBACK
```

`UNKNOWN` is written wherever the runtime records no link. `UNKNOWN` is not a
hedge; it means an inspector reading canonical records would find nothing
joining those two points, and that inventing one would be a lie.

---

## DIAGRAM 1 — ORDINARY PERSONAL

### `adult.household-standing`, option "Work out who does what"

### **[MAIN-PLAYABLE]**

```
  PLAYER ACTION
  =============
  Beat presented by projectStoryMoment() -> StoryView
  Player presses:  [ Work out who does what ]
                     <small>Turn it into a standing arrangement rather than a row.</small>
  Handler: chooseStoryOption(world, { personId, scene, optionKey })
      |
      v
  LISTENERS
  =========
  There is no listener model on a situation beat. The event's involvedEntityIds
  carry the player and the resolved companion (an AdultCompanionRole of
  "household-member", bound by resolveAdultCompanion from an active
  household-membership record).
      listeners as such ......................... UNKNOWN — situations have no
                                                  audibility or hearing model
      counterpart .............................. the bound household member
      |
      v
  CLAIM / KNOWLEDGE / PERCEPTION
  ==============================
      claim ..................... NONE. Situations do not write claims.
                                  Nobody in this beat is recorded as having
                                  SAID anything; the record is that the player
                                  DID something.
      knowledge ................. recordEventKnowledge is called by
                                  character-history's write path for the
                                  participants
      perception ................ UNKNOWN — no perception is written by the
                                  situation path
      |
      v
  NPC / RELATIONSHIP / COMMITMENT EFFECT
  ======================================
      option.nudges[] ........... applied to the player model as GAMEPLAY-strength
                                  evidence (1.2), via episodeChoiceEvidence /
                                  adult choice evidence in life-choice-evidence.ts
      option.writes ............. for this option: none.
                                  (Other options carry AdultOptionWrite of kind
                                   "take-on-commitment" -> recordLifeCommitment,
                                   or "join-community-organization" ->
                                   createOrganizationParticipation)
      relationship record ....... UNKNOWN — no recordRelationshipInteraction
                                  fires on a situation choice
      |
      v
  POSSIBLE LATER CALLBACK
  =======================
      option.aftermath = "obligation"
          -> decideAftermath(context)
          -> counterpart exists?  yes (household member)
          -> stillConnected(player, counterpart)?  yes (shared household record)
          -> schedule at occurredAt + 96 days
          -> scheduleFutureDueItem(transitionKey = "life:callback")
      Then, on any advanceWorld past that date:
          -> lifeCallbackTransitionHandler
          -> counterpartRaisesIt(world, ...) weighs ONLY the recorded
             relationship interactions between these two people
          -> either recordWorldEvent (it came back, reason "life:came-back")
             or a terminal state with a reason:
                life:nobody-to-carry-it | life:nobody-heard |
                life:issue-overtaken   | life:actor-lost-standing |
                life:attention-moved
```

**Note the honest weakness this diagram exposes:** `counterpartRaisesIt` weighs
recorded _relationship interactions_, but the situation path never writes one.
So for a household beat, the callback decision is made from whatever
relationship record exists for other reasons — and in the shipped game, since
the only relationship-writing intents (`reassure`/`press`) are unreachable,
that is usually nothing at all.

---

## DIAGRAM 2 — QUIET / PRIVATE CONVERSATION

### `household-obligation`, intent `offer-to-cover`, audibility `private`

### **[MAIN-SUBSTRATE]** — the audibility parameter is unreachable in play

```
  PLAYER ACTION
  =============
  Player picks:  intent = "offer-to-cover"
                 addressee = <the other person>
                 audibility = "private"        <-- NOT REACHABLE IN SHIPPED PLAY
  commitConversationTurn(world, { session, room, progress, turnOrdinal,
                                  addressee, audibility, intent })
      |
      +-- availableConversationIntents(...) must contain "offer-to-cover",
      |   or the turn is refused with
      |   "Conversation intent offer-to-cover is unavailable for this addressee."
      +-- rejectDuplicateTurn(`${sessionKey}:turn:${n}`)
      |
      v
  LISTENERS
  =========
  resolveConversationListeners(room, addressee, "private")
      if (!room.privateAvailable) THROW room.privateUnavailableReason
      possibleListeners = [addressee]          <-- and nobody else
      returns canonicalPeople(...) minus the player
      => actualListenerPersonIds = [ addressee ]
      => quietAmbientHearingPersonIds ......... deliberately NOT consulted
      => normalHearingPersonIds ............... deliberately NOT consulted
      |
      v
  NPC RESPONSE
  ============
  resolveNpcResponse -> resolveHouseholdObligationResponse
      switch ("offer-to-cover"):
          dialogue   = `"Then I owe you one," ${familyName} says. "I mean that."`
          perception = `${fullName} accepted the offer and said it counted.`
          outcome    = "reassured"
          durableDecisionRecorded = FALSE          <-- no NPC decision was made
      |
      v
  CLAIM / KNOWLEDGE / PERCEPTION
  ==============================
  event      visibility = "private"
             tags = [ subjectContextTag,
                      "conversation.intent.offer-to-cover",
                      "conversation.audibility.private",
                      subjectTag ]
             participants:
                player    role = agency:initiator, "Chose the offer-to-cover intent"
                addressee role = focus:respondent, "Gave the recorded response"
  claim      audience = "private"
             statement = the line above
             relationshipToTruth = "unknown"           <-- always
             provenance = { kind: "direct-record" }
  knowledge  presence: one per participant (2)
                 accuracy = "accurate", confidence = "high", source = direct
             claim: one per listener != speaker (1: the player)
                 accuracy = "unknown", confidence = "high"
                 source = { told-by, sourcePersonId, claimId }
  perception one, held BY THE PLAYER, ABOUT the NPC
                 subjectKind = "entity:conversation-position"
                 subjectKey  = `conversation-response:${npcId}`
                 confidence  = "medium", sourceCredibility = "medium"
                 source = { heard-claim, claimId, knowledgeId }
                 supersedesPerceptionId = null           <-- always
      |
      v
  NPC / RELATIONSHIP / COMMITMENT EFFECT
  ======================================
      relationshipConsequenceFor("offer-to-cover") = null
      => NO recordRelationshipInteraction
      => offering to take on somebody else's week changes nothing
         about the relationship record.                   <-- FINDING D-02
      commitment .............. UNKNOWN — the conversation engine writes no
                               life commitment; only situation/episode
                               `writes` do that
      |
      v
  POSSIBLE LATER CALLBACK
  =======================
      UNKNOWN.
      The conversation engine schedules NO future due item. There is no
      conversation equivalent of AdultAftermathKind. A private promise made in
      a conversation cannot come back, because nothing recorded it as a thing
      that could.
```

**This diagram is the clearest single statement of what the dialogue system
cannot do yet.** The plumbing for privacy, listeners, claims and perceptions is
excellent and fully recorded. The consequences are almost entirely absent.

---

## DIAGRAM 3 — FORMATIVE

### `formative.friend-conflict`, a childhood beat

### **[MAIN-PLAYABLE]**

```
  PLAYER ACTION
  =============
  projectFormativeYears(world, personId) -> FormativeScene
  Player presses one of the authored options (2–4 per situation; 49 across 19)
  Handler: chooseFormativeOption(world, { personId, scene, optionKey })
      |
      v
  LISTENERS
  =========
      resolveFormativeCompanion(world, ...) binds a FormativeCompanionRole
      from real records (household member, kin, schoolmate)
      hearing model .............. UNKNOWN — formative beats have none
      |
      v
  CLAIM / KNOWLEDGE / PERCEPTION
  ==============================
      claim ...................... NONE
      knowledge .................. recordEventKnowledge via character-history
      perception ................. UNKNOWN
      memory ..................... recordMemory (character-history writes one)
      |
      v
  NPC / RELATIONSHIP / COMMITMENT EFFECT
  ======================================
      option.nudges .............. player-model evidence at GAMEPLAY strength
      recordRelationshipInteraction   character-history DOES call this on some
                                      formative writes (unlike adult situations)
      recordAppraisal / recordTemporaryState  called for some formative options
      |
      v
  POSSIBLE LATER CALLBACK
  =======================
      Within the formative years: `letTimePass(world, personId)` advances by
      formativeStepDays(...) and re-projects. A later formative situation may
      become eligible because of a record this one wrote.
      Across the boundary into adulthood: UNKNOWN.
      Nothing in the adult banks requires a formative choice by key. The
      episode requirement grammar CAN express it (`after-choice`), and no
      shipped family uses it across the age-18 line.
```

**FINDING D-08 — the formative/adult seam carries no explicit callbacks.
[OPEN-PR #87]** The machinery exists (`after-choice` requirements,
`days-since-stage`), and `growing-up.a-friend-over-years` proves a family can
span years. But no shipped content makes an adult beat depend on a named
childhood choice. This is the single highest-value content addition available
(see Part 6, improvement #1).

---

## DIAGRAM 4 — ADULT RECURRING THREAD

### `home.the-week-that-does-not-balance`, stages 1 → 2 → 3

### **[OPEN-PR #87]**

```
  STAGE 1  the-first-time-it-is-said
  ==================================
  ELIGIBILITY (every satisfied requirement kept separately as a causalInput):
      role role=household-companion
          -> "household-companion is Amir Ruiz: Resident on the same
              household record."
          -> records: household-membership_780a02c3c628815f
      age-at-least age=18
          -> "Age 34; needs at least 18."
          -> records: none (a negative or age requirement)
      fact fact=household.shared
          -> "household.shared: Somebody else is on the household record."
          -> records: household-membership_780a02c3c628815f

  instanceKey = home.the-week-that-does-not-balance
                  [household-companion=person_3b7a8a8aa16b45dc]

  PLAYER ACTION:  [ take-it-on | explain | pay-for-it | later ]
  say the player chooses `explain`
      |
      v
  LISTENERS
  =========
      the bound household-companion (Amir Ruiz)
      hearing model .......... UNKNOWN — episodes are beats, not conversations
      |
      v
  CLAIM / KNOWLEDGE / PERCEPTION
  ==============================
      claim ................. NONE
      event ................. tagged  episode:home.the-week-that-does-not-balance
                                      episode-stage:the-first-time-it-is-said
                                      episode-instance:<instanceKey>
                                      choice.<optionKey>
      knowledge ............. written for participants
      perception ............ UNKNOWN
      |
      v
  NPC / RELATIONSHIP / COMMITMENT EFFECT
  ======================================
      option.nudges ......... player model, gameplay strength
      option.writes ......... null for `explain`
                              (other options can carry take-on-commitment)
      thread ................ narrativeThreads() now reports a live
                              "household:Amir Ruiz" thread, justified by
                              shared-person + shared-record link bases
      |
      v
  STAGE 2  it-was-taken-seriously            <-- THE ACTUAL BRANCH
  ==============================
      requires:  after-stage the-first-time-it-is-said
                 (and in the branching families, after-choice / without-choice
                  on the specific option)
      This is where the recurring thread becomes real: the stage is offered
      because THIS instance, with THIS person, played THAT stage.
      options: [ swap | keep ]
      |
      v
  STAGE 3  it-came-back-harder
  ============================
      requires:  after-stage it-was-taken-seriously
                 days-since-stage <n>       <-- time must actually have passed
      options: [ change-something | concede-nothing | buy-time ]
      |
      v
  POSSIBLE LATER CALLBACK
  =======================
      WITHIN the family: fully recorded. Each stage names the stage and (where
      the family branches) the option it depends on, and every satisfied
      requirement is preserved with the record ids that answered it.
      OUTSIDE the family: UNKNOWN. No shipped content makes a beat in another
      family depend on a stage of this one, though `after-stage` could express it.
      THREAD DORMANCY: after THREAD_DORMANT_AFTER_DAYS = 400 with no new record,
      threadPresence() reports the thread dormant. It is never deleted.
```

---

## DIAGRAM 5 — POLITICAL / LEGISLATIVE

### `transit-access-pilot-provision`, intent `discuss-provision`

### **[MAIN-SUBSTRATE]** (conversation) + **[MAIN-PLAYABLE]** (the workspace)

```
  PLAYER ACTION
  =============
  Player picks intent = "discuss-provision" with the briefing lead
      |
      v
  LISTENERS
  =========
      resolveConversationListeners as normal — but note this subject is only
      reachable from ConversationStrip on the dev route, so in practice
      audibility is whatever that control is set to.
      |
      v
  NPC RESPONSE
  ============
  resolveLegislativeProvisionResponse(world, { speakerPersonId, progress })
      Reads world.history.knowledge to find what the briefing lead ACTUALLY
      KNOWS about the provision, then returns a line conditioned on that.
      This is the only non-office responder that reads world state at all.
      durableDecisionRecorded = FALSE — it reads state but does not DECIDE.
      |
      v
  CLAIM / KNOWLEDGE / PERCEPTION
  ==============================
      event summary is composed from canonical amounts:
        "<player> asked <speaker> about the selected <currentAmount> Transit
         Access Pilot working provision and its prepared <preparedAmount>
         version."
      claim / knowledge / perception: exactly as Diagram 2.
      |
      v
  NPC / RELATIONSHIP / COMMITMENT EFFECT
  ======================================
      relationshipConsequenceFor("discuss-provision") = null   -> no interaction
      commitment ............ UNKNOWN from the conversation.
      |
      v
  THE SEPARATE, GENUINELY DEEP LEGISLATIVE PATH   [MAIN-PLAYABLE]
  ==============================================
  Reachable in normal play when the character works for a legislature with an
  accepted rule pack (3 of 4 places: Kentucky, Nebraska, Alaska):
      LegislationWorkspace
        -> legislation-session.ts
        -> advanceWorld(world, days, HEARING_HANDLERS)
             HEARING_HANDLERS registers exactly one transition key:
                 COMMITTEE_HEARING_TRANSITION_KEY
        -> recordCommitteeDisposition
        -> recordConcurrenceVote
        -> recordEnactment
        -> recordExecutiveAction
        -> recordAdjournmentDeath (a bill that dies when the session ends)
      |
      v
  POSSIBLE LATER CALLBACK
  =======================
      Within the legislative session: fully modelled — a scheduled hearing is a
      real future due item that resolves on time advance.
      Between the conversation and the bill: UNKNOWN. Talking to the briefing
      lead about a provision does not change the provision, the vote plan, or
      anybody's disposition. The conversation and the legislature share a world
      and no causal edge.
```

**FINDING D-09 — the deepest political machinery in the game has no dialogue
attached to it. [MAIN-PLAYABLE]** `legislation.ts` is 2,592 lines with 57
exports and a real rule-pack system; `legislature-rules.ts` adds 713 more. The
one legislative conversation subject cannot influence any of it.

---

# PART 5 — THE COPY AUDIT

## 5.1 Method

Every authored option in the episode and adult banks (189 options) was extracted
programmatically and scanned for named weak-writing classes. Setup bank copy
(198 options, 53 prompts) was measured separately. Nothing here is impressionistic.

## 5.2 What the copy gets right — measured, not asserted

```
  narrator asserting the player's interior state
      ("you feel", "you realize", "you decide that") ........ 0 hits
  telling the player what mattered
      ("it was important", "it was significant") ............ 0 hits
  vague connective ("somehow") ............................. 0 hits
  abstract noun "situation" ................................ 0 hits
  forecast of consequence ("this will cause/lead to") ...... 0 hits
  duplicate option descriptions ............................ 0 of 189
  duplicate option memories ................................ 0 of 189
  duplicate setup option text .............................. 0 of 198
```

**This is a genuinely strong result and should be said plainly.** The most
common failure mode in narrative RPG copy — the narrator telling the player how
their own character feels — does not occur once in 436 authored options. Every
option's `memory` field (what the person remembers afterwards) is distinct from
its `label` (the words on the button), which is the discipline that keeps the
canonical record from being button text.

Prose blocks are also well-sized: 67 blocks, 55–247 characters, median 138. That
is one to two sentences per beat, which is the right density for a screen that
also carries 2–4 buttons.

## 5.3 Weak-writing classes that DO occur

**FINDING C-01 — duplicate option labels across families. 19 of 189 labels are
reused. [OPEN-PR #87]**

```
   6x  "Say no"
   3x  "Keep it to yourself"
   3x  "Let it go"
   3x  "Take it"
   3x  "Go"
   2x  "Cover for them"    2x "Say yes"        2x "Turn it down"
   2x  "Step back from it" 2x "Sign it"        2x "Deal with it"
```

The descriptions underneath are all distinct, so the meaning is never ambiguous
in context. But "Say no" appearing six times across six different families makes
the game feel like it has fewer choices than it has, and it is the specific
thing a player notices on a second playthrough. Severity: low-moderate. Fix: give
each refusal its own verb — "Say no" → "Tell them you can't", "Leave it with
them", "Decline the letter", etc.

**FINDING C-02 — 20 labels are under 8 characters. [OPEN-PR #87]**

```
  Go (x3) | Refuse | Say yes (x2) | Say no (x6) | Take it (x3)
  Sign it (x2) | Make do | Do it | Stay in
```

A two-character label ("Go") next to a 41-character label in the same screen
reads as unfinished. The `<small>` description carries the meaning, so nothing
is broken — but the button row looks ragged. Fix: floor of ~10 characters.

**FINDING C-03 — one genuine forecast. [OPEN-PR #87]**

```
  adult.promise-comes-due :: "Let it go" / "It will probably not be raised."
```

This tells the player the outcome before they choose. Every other description in
the bank describes _what the choice is_, not _what will happen_. This one should
read something like "Leave it, and find out." Severity: low, but it is exactly
the class of leak the wave's own `life-opacity.test.ts` exists to prevent (that
test bans mechanism words like `stakes`, `pressing`, `notable`, `cross-pressure`,
`dormant`, `salience`, `confidence`, `weight`, `dimension` — it does not yet ban
outcome forecasts).

**FINDING C-04 — abstract nouns "thing"/"something" in 20 of 189. [OPEN-PR #87]**
Most are legitimate ("Say this is a different thing" is exactly right for a
favour being re-traded). A handful are lazy: "Change something real",
"Deal with it". Severity: low. Fix on contact, not as a sweep.

**FINDING C-05 — 15 of 53 calibration items are `policy-docket-flagged`.
[MAIN-PLAYABLE]** The bank's own transparency review says these are

> _"Balanced and scenario-framed, but the axis under test is legible to a
> politically literate player. Carried as authored supply pending re-authoring
> by the research lane."_

That is honest self-assessment carried in the data, which is excellent practice.
It also means **28% of the calibration can be gamed by a player who recognises
the axis.** The 36 `non-transparent` items are the good ones. Severity: moderate;
owned by the research lane, not by implementation.

**FINDING C-06 — the four flat responders' lines cannot vary. [MAIN-PLAYABLE]**
This is D-01 restated as a copy problem. `"Then I owe you one," Ruiz says. "I
mean that."` is a good line. It is also the _only_ line, forever, for that
intent, for every NPC, in every world. Eleven of the fifteen intents have exactly
one possible response line each. The `selectAuthoredVariant<T>()` helper already
exists in `conversation-subjects.ts` and is the seam for fixing this.

**FINDING C-07 — Americanisation was a live defect this wave. [OPEN-PR #87]**
During authoring, this wave's new copy was written with British idiom throughout
(£, councils, councillors, catchment, lorries, tills, bins, boiler) and had to be
corrected before commit. This is the same class of error the packet itself names
with "central ministry". There is **no automated guard** against it. A lint rule
over the content banks for a small British-idiom word list would cost an hour and
prevent a recurrence. See improvement #12.

## 5.4 Hard-coded switches — the complete list

Every place a dialogue outcome is decided by a `switch` on a literal rather than
by world state:

```
  src/presentation/run-b-conversation.ts
     resolveHouseholdObligationResponse    switch (input.intent)   5 cases
     resolveSchoolProjectResponse          switch (input.intent)   4 cases
     resolveNeighborhoodMeetingResponse    switch (input.intent)   4 cases
     relationshipConsequenceFor            2 literal ifs
     resolveLegislativeProvisionResponse   reads knowledge, then fixed lines

  src/player/PlayerGame.tsx
     HouseholdConversation                 audibility: "normal"    literal
                                           addressee: [0]          literal
                                           subject: "household-obligation" literal
```

---

# PART 6 — WHAT THE DIALOGUE SYSTEM CAN AND CANNOT DO

## WHAT OUR DIALOGUE SYSTEM CAN DO TODAY

1. **Add a whole new conversation subject without touching the engine.** Intents
   are open strings validated against the subject's own offer. This is rare and
   valuable. **[MAIN-PLAYABLE]**
2. **Model who could hear something, honestly and three ways.** normal / quiet /
   private resolve to genuinely different listener sets, and `private` writes a
   `visibility: "private"` event that no third party gets knowledge of.
   **[MAIN-SUBSTRATE — no control reaches it]**
3. **Distinguish what happened from what somebody was told.** Presence knowledge
   is `accuracy: "accurate"`; claim knowledge is `accuracy: "unknown"` with a
   `told-by` source naming the speaker and the claim. That is a real
   epistemology, not a flag. **[MAIN-PLAYABLE]**
4. **Record a perception as an opinion with a traceable source.** Every
   perception names the claim and the knowledge record it came from.
   **[MAIN-PLAYABLE]**
5. **Refuse a turn that does not make sense.** Wrong intent for the subject,
   duplicate turn ordinal, private in a room with no privacy, an inaudible
   pending contribution — all throw with a readable message rather than
   silently doing something odd. **[MAIN-PLAYABLE]**
6. **Let an NPC genuinely decide** — on exactly one subject and two intents —
   via `evaluateConversationDecision` and a durable decision trace.
   **[MAIN-SUBSTRATE]**
7. **Resume a conversation from canonical history.** `HouseholdConversation`
   derives its progress and turn ordinal from `world.history` rather than from
   component state, so saving, reloading and reopening puts the player back
   where the world says they are. **[MAIN-PLAYABLE]**
8. **Branch a multi-stage authored family on the exact option chosen months
   earlier** — `after-choice` / `without-choice` / `days-since-stage`.
   **[OPEN-PR #87]**
9. **Keep every reason a beat was offered, separately, with the record ids that
   answered it** — `EpisodeCausalInput[]`, never collapsed into one cause.
   **[OPEN-PR #87]**
10. **Compose narration over canonical state** — connective time-passage lines,
    thread recaps, recurring-people lines, all from records. **[OPEN-PR #87]**

## WHAT IT CANNOT DO YET

1. **Let the player choose how loudly to speak.** Audibility is the literal
   `"normal"` in the only reachable conversation. (D-03)
2. **Let the player choose who to speak to.** Always `eligibleAddresseePersonIds[0]`. (D-05)
3. **Let the player address the room.** `"everyone"` is unreachable. (D-04)
4. **Vary an NPC's line by who that NPC is.** Four of five subjects return one
   fixed string per intent. (D-01, C-06)
5. **Let a conversation change a relationship**, except via two office intents
   the player cannot reach. (D-02)
6. **Let a conversation create an obligation that comes back.** Conversations
   schedule no future due items. Only situation/episode `aftermath` does. (Diagram 2)
7. **Let a conversation change the legislature.** No edge exists. (D-09)
8. **Revise a perception.** `supersedesPerceptionId` is always null. (D-07)
9. **Let anybody lie.** `relationshipToTruth` is always `"unknown"`. (D-06)
10. **Carry a childhood choice into adulthood by name.** The grammar can; no
    content does. (D-08)
11. **Have more than one conversation subject in the shipped game.** One. (2.1)
12. **Say a line twice differently.** No variant selection is wired, though
    `selectAuthoredVariant` exists.
13. **Interrupt, overlap, or leave a conversation mid-turn.** The turn is atomic.
14. **Let an NPC start a conversation.** Every turn begins with a player intent.
15. **Remember a conversation in the journal as a conversation.** The journal
    projects events; a five-turn conversation reads as five events.

---

# PART 7 — TOP 25 DIALOGUE IMPROVEMENTS BY PLAYER VALUE

Ordered by _what a player would notice_, not by implementation cost. Effort is
given as S (hours), M (a day), L (multi-day).

| #   | Improvement                                                                                                            | Effort | Why it matters                                                                                                                                          |
| --- | ---------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Make one adult beat require a named childhood choice** (`after-choice` across the age-18 line)                       | S      | The single most valuable content change available. It is the promise of the whole game — that a life is one life — and the grammar already supports it. |
| 2   | **Expose the audibility control in `PlayerGame`**                                                                      | S      | Three fully-built, fully-tested social modes currently unreachable. The control already exists in `ConversationStrip`; move it.                         |
| 3   | **Let the player pick the addressee**                                                                                  | S      | A household with three people currently has one person the player can ever speak to.                                                                    |
| 4   | **Give `offer-to-cover`, `ask-to-share`, `ask-for-time`, `ask-to-split`, `say-you-will-go` relationship consequences** | S      | Five intents that are obviously about the relationship currently change nothing. Extend `relationshipConsequenceFor` beyond its two entries.            |
| 5   | **Make conversations able to schedule an aftermath**                                                                   | M      | "I'll cover it this week" should be able to come back in 96 days, exactly as an adult situation's obligation does. Reuse `decideAftermath` verbatim.    |
| 6   | **Give the household responder 3 variants per intent, selected by recorded relationship state**                        | M      | Turns the one reachable conversation from a lookup table into something that reads the world. `selectAuthoredVariant` is the seam.                      |
| 7   | **Wire a second subject into `PlayerGame`** — `neighborhood-meeting-notice`                                            | S      | It already exists, is already tested, and connects directly to `civic.the-thing-nobody-else-turned-up-for`.                                             |
| 8   | **Use `supersedesPerceptionId`**                                                                                       | S      | Stops NPCs accumulating contradictory live opinions.                                                                                                    |
| 9   | **Give the household/school/neighborhood responders real decisions** via `evaluateConversationDecision`                | L      | The largest single upgrade to NPC believability. The office path proves the pattern.                                                                    |
| 10  | **Fix the six "Say no" labels**                                                                                        | S      | Cheapest perceptible quality win in the document.                                                                                                       |
| 11  | **Add a variant pool to `resolveQuietRoom`**                                                                           | S      | "The room settled briefly; no participant added another claim." is currently the only silence in the game.                                              |
| 12  | **Add a British-idiom lint over the content banks**                                                                    | S      | Prevents recurrence of C-07 (£, council, councillor, catchment, lorry, till, bin, boiler, mum, whilst, amongst).                                        |
| 13  | **Ban outcome forecasts in option descriptions in `life-opacity.test.ts`**                                             | S      | Extends the existing guard from mechanism words to prediction. Fixes C-03 permanently.                                                                  |
| 14  | **Let a conversation turn write a `LifeCommitment`**                                                                   | M      | The `ask-for-time` response literally says "Fine. I will do it… Not every week, though" and nothing is recorded.                                        |
| 15  | **Project a conversation as one journal entry, not five**                                                              | M      | A five-turn conversation currently reads as five log lines.                                                                                             |
| 16  | **Let an NPC open a conversation**                                                                                     | L      | Every conversation in the game today is player-initiated.                                                                                               |
| 17  | **Connect the legislative conversation to the vote plan**                                                              | L      | Talking to the briefing lead should be able to move one disposition.                                                                                    |
| 18  | **Use `relationshipToTruth`** — one NPC who shades the truth                                                           | M      | The field exists and carries no information. One dishonest NPC would make claim-knowledge meaningful.                                                   |
| 19  | **Give the school subject a formative-years home in `PlayerGame`**                                                     | M      | It is a school subject with no school to be in; the formative years are where it belongs.                                                               |
| 20  | **Vary `significance` on relationship interactions**                                                                   | S      | Always `"meaningful"` today.                                                                                                                            |
| 21  | **Author 2 more episode families in under-served areas** — bereavement, moving house                                   | L      | 9 families is thin for a 50-year life; the two commonest life events are absent.                                                                        |
| 22  | **Add `without-choice` branches to the 2 non-branching families**                                                      | M      | `growing-up.a-friend-over-years` and `school.the-thing-you-got-blamed-for` branch on stage but not on option.                                           |
| 23  | **Show the open-threads list as pressing/dormant, in the player's words**                                              | S      | `threadPresence()` computes it; the UI shows an undifferentiated list.                                                                                  |
| 24  | **Floor option labels at ~10 characters**                                                                              | S      | Fixes the ragged button row (C-02).                                                                                                                     |
| 25  | **Re-author the 15 `policy-docket-flagged` calibration items**                                                         | L      | 28% of calibration is gameable by a politically literate player. Owned by the research lane.                                                            |

---

# PART 8 — CONTENT EXPANSION RULES

## So 1,000 more lines do not become a mess

These are the rules the existing content already follows. Writing them down is
what makes them survivable at ten times the volume.

### RULE 1 — The button text is never the record.

Every option carries **both** a `label` (what the player presses) and a `memory`
(what the person remembers afterwards). All 189 memories are distinct from their
labels. If a new option's memory is its label with the tense changed, it is not
finished.

```
   label:       "Work out who does what"
   description: "Turn it into a standing arrangement rather than a row."
   memory:      <what the person carries away — a fact, not an instruction>
```

### RULE 2 — Describe the choice, never the outcome.

The description says _what this is_. It does not say what will happen. There is
exactly one violation in 189 options today (C-03); keep it at zero.

### RULE 3 — Never write the player's interior state.

Zero occurrences of "you feel", "you realize", "you decide that" in 436 options.
This is the single hardest discipline in narrative content and this project
currently has a perfect record. Do not be the line that breaks it.

### RULE 4 — Every new beat must declare why it is eligible, in the grammar.

Not "the player is 34" in prose — an `EpisodeRequirement` the engine can check
and the report can print. A beat whose eligibility cannot be expressed as
requirements is a beat that will fire at the wrong time in somebody's life.

### RULE 5 — Adjacency is never a link.

Two records being near each other in time is not a relationship. A thread exists
only on a declared `ThreadLinkBasis`: `shared-person`, `shared-organization`,
`shared-record`, `shared-stable-key`. If you cannot name the basis, there is no
thread.

### RULE 6 — Provenance is a field, not a comment.

`EpisodeAuthority { sourceDocument, reference }` exists so a reviewer can find
where a family's copy came from. Fill it in. An unattributed family is one
nobody can check.

### RULE 7 — Aftermath is opt-in and must stay rare.

`aftermath: null` is the correct answer for most options, and the code says so:
_"The commonest case, and it must stay the commonest case. Most of what a person
does is finished when they have done it."_ If more than about a third of a new
family's options carry an aftermath, the family is over-promising.

### RULE 8 — American English, always.

No £, councils, councillors, catchment, lorries, tills, bins, boilers, mum,
whilst, amongst. See improvement #12 for the lint that should enforce it.

### RULE 9 — A new subject brings its own vocabulary.

Do not add an intent to a shared list and reuse it across subjects with different
meanings. `raise-obligation` means one thing at home; a workplace subject needs
its own verb. The engine is built for this — intents are open strings.

### RULE 10 — One line per intent is a placeholder, not content.

Ship at least three variants per intent, selected by something the world knows.
`selectAuthoredVariant<T>()` exists for exactly this.

### RULE 11 — Register the register.

Every calibration item declares one of six `QuestionnaireRegister` values, and
the selector uses a `REGISTER_GATE_PENALTY` to stop the questionnaire asking five
policy questions in a row. A new item without a register breaks the pacing model.

### RULE 12 — Declare transparency honestly.

`TransparencyReview.verdict` is the author's own assessment of whether a
politically literate player can see the axis. Fifteen items today say
`policy-docket-flagged`, which is uncomfortable and correct. A new item marked
`non-transparent` that obviously is not will corrupt the calibration silently.

### RULE 13 — Names in banks are not biography.

`setup-opening-bank.ts` carries the note "THESE PEOPLE ARE NOT BIOGRAPHY." The
recurring named people (Dana, Marcus, Priya, Ray, Ms. Whitfield, Curtis, Nell)
are authored fixtures for the calibration, not characters in the player's world.
Keep the two populations separate.

### RULE 14 — Test the promise, not the implementation.

The wave's `life-opacity.test.ts` asserts that mechanism words never reach a
player surface, and `narrative-life.test.ts` asserts six play-proof paths. A new
content family should come with an assertion about what the _player_ can see,
not about what the function returns.

### RULE 15 — When the system cannot do it, say so in the document, not in the copy.

The formative/adult callback gap (D-08) is stated in this audit and pinned as a
failing-when-fixed test. It is not papered over with a line of prose that implies
a connection the records do not carry. That is the standard.

---

# APPENDIX — REPRODUCING EVERY NUMBER

```bash
# Subjects, intents, audibility
node --import tsx -e '
  import("./src/presentation/conversation-subjects").then(m =>
    console.log(m.conversationSubjectKeys()));'

# Bank counts
node --import tsx -e '
  import("./src/simulation/episode-bank").then(m =>
    console.log(m.episodeBankSummary()));'
# -> { version: pg-episode-bank-v1, families: 9, stages: 32, options: 87,
#      familiesWithBranching: 7, familiesWithQuietEnding: 4 }

# Adult bank
node --import tsx -e '
  import("./src/simulation/adult-situations").then(m => {
    const b = m.adultSituationBank();
    console.log(b.length, b.reduce((n,s)=>n+s.options.length,0)); });'
# -> 35 102

# Setup bank
node --import tsx -e '
  import("./src/simulation/setup-questionnaire-bank").then(m =>
    console.log(m.SETUP_QUESTIONNAIRE_BANK.length,
      m.SETUP_QUESTIONNAIRE_BANK.reduce((n,i)=>n+i.options.length,0)));'
# -> 53 198

# Hard-coded switches
grep -n "switch (input.intent)" src/presentation/run-b-conversation.ts

# The production conversation's hard-coded parameters
sed -n '1541,1649p' src/player/PlayerGame.tsx

# A full traced life, including every beat's causal inputs
npm run report:life -- audit-seed
```

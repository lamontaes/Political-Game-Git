# PROSE B — contextual scenes and Lie follow-through

Authority: PLAYTEST-PORK-01 section B ("APPROVED PROSE — CONTEXTUAL SCENES AND
LIE FOLLOW-THROUGH", owner-approved), the shared four-chat coordination, and
ALIVE44 chunk 7 (deliberate deception contract). Branch
`claude/prose-contextual-scenes` on `main` fed321f7.

## Contract as built

- **One engine.** Six families are ordinary conversation subjects
  (`scene-home-evening`, `scene-favor`, `scene-party-invite`,
  `scene-campaign-reaction`, `scene-staff-followup`,
  `scene-reporter-question`) on `commitConversationTurn`. Two additive engine
  seams: `ConversationResolvedResponse.extraTags`, and the UI-owned
  `ConversationIntentOption.truthIntent` (byte-identical `lie-marker.ts`).
- **Bound once, saved.** `src/simulation/scene-bindings.ts` writes one
  `scene.contextual-bound` event per situation with a versioned
  `scene.binding.v1:` tag (speaker, relationship, request, place, sources,
  facts, known records, target, date, expiry). No new history family; save
  formats are unchanged. Producers (`contextual-scene-producers.ts`) run only
  when ordinary days actually pass (`passOrdinaryDays`), never on a read, and
  never when a life opens (that would move the replay frontier).
- **Claim stance.** `src/simulation/claim-stances.ts` saves proposition,
  asserted value, speaker belief, epistemic intent, exact words, recipients,
  audibility and sources as a `claim.stance.v1:` tag on the turn event, and
  writes the player's words as an ordinary `ClaimRecord` with told-by
  knowledge for each listener. A stance the recorded belief does not support
  is refused.
- **Discovery, no detector.** `claim-contradictions.ts` schedules one
  `claim:contradiction-check` due item for a `deceive` or `from-memory`
  stance. `attends:` — a housemate who heard the denial sees the player leave
  for the event they actually attended. `promised:` / `accepted:` — a reporter
  asks another person who heard or received the promise, and that person
  decides whether to confirm. A discovery writes its own event, knowledge,
  memory, relationship interaction and a follow-up binding
  (`claim-came-back` / `memory-corrected`). Deliberate: strained, meaningful.
  From memory: maintained, minor.
- **Time.** No turn advances the clock. Agreeing and doing stay separate:
  accepting an invitation uses `acceptChapterInvitation`; a favor answer uses
  `chooseAdultOption`; performing either stays with its own activity.
- **Existing wording.** The household, school and posted-meeting subjects
  open with spoken lines and specific topics instead of narrator prompts.

## Families and where their facts come from

| Family            | Source records                                                                                                                      | Lie offered when                  |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| home-evening      | the player's confirmed or tentative evening activity within 3 days; an adult housemate (partner preferred)                          | the activity is confirmed         |
| favor             | an open `favour-request` / `extra-hours-request` and its saved terms                                                                | never                             |
| party-invite      | an open chapter invitation and its organizer                                                                                        | never                             |
| campaign-reaction | `election.contest-resolved` within 7 days; the seat's start date                                                                    | never                             |
| staff-followup    | an active member seat, legislative staff, a pending bill in the chamber                                                             | never                             |
| reporter-question | a player-held legislative commitment, or (public life only) an accepted chapter invitation; the journalist was told by the promisee | always (the promise is on record) |

## Known limits

- Ordinary lives start without partnerships, so partner lines are rare.
- The current bargaining flow does not produce player-held legislative
  commitments; the `promised:` basis waits for GOVERNING producers.
- Staff scenes need hired staff; ordinary seating hires none.
- Executive office work is not bound yet; it waits for GOVERNING records.
- A discovered lie produces a conversation, memory, relationship and journal
  consequence, not a news story.

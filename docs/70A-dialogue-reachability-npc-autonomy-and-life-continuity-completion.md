# 70A — PR #87 Dialogue Reachability, NPC Autonomy and Life Continuity — Completion

Canonical completion report for
`70_CLAUDE_PR87_DIALOGUE_REACHABILITY_NPC_AUTONOMY_AND_LIFE_CONTINUITY_UPLIFT`.

This is a continuation of PR #87, not a new one. No second PR was opened.

Published to Drive as
[`70A_CLAUDE_PR87_DIALOGUE_REACHABILITY_NPC_AUTONOMY_AND_LIFE_CONTINUITY_COMPLETION`](https://docs.google.com/document/d/1Ygk6XVGzJq2N4abaFx5n59nVrluUcBXCS6HpNAlgTUQ/edit)
(`1Ygk6XVGzJq2N4abaFx5n59nVrluUcBXCS6HpNAlgTUQ`), beside 60A–60D.

---

## 1. Exact state

|                        |                                                                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Repository             | `lamontaes/Political-Game-Git`                                                                                                           |
| Pull request           | [#87](https://github.com/lamontaes/Political-Game-Git/pull/87), draft, **left unmerged**                                                 |
| Branch                 | `claude/pr81-narrative-graphics-lifeflow-t8j8oe`                                                                                         |
| Head at packet issue   | `b7e6ca6f9c216e1db7cda00f90bb4596d31add6a`                                                                                               |
| Head verified live     | Fetched from GitHub before editing; #87 pointed at this branch at exactly that SHA, draft and unmerged, and no other writer had moved it |
| Base                   | `6311dd688331985d5682b39910bf2b917d46d11b` (unchanged)                                                                                   |
| Diff added this packet | 26 files changed, 4,771 insertions, 429 deletions                                                                                        |

### Commits added

| SHA       | Subject                                                       |
| --------- | ------------------------------------------------------------- |
| `b91ff22` | Let a conversation change something                           |
| `4184345` | Let a player choose who they are talking to, and how loudly   |
| `9020bc9` | Make a childhood answer decide which adult scene exists       |
| `5e02bbf` | Say what the choice is, in words that are not somebody else's |
| `ecfc842` | Show a conversation as an evening, not as five log lines      |
| `19bb36f` | Prove in a browser that a player can reach a conversation     |

This report is committed on top of those six.

---

## 2. 60C findings consumed

| 60C finding                                                                                                         | What was done                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **D-01** four of five subjects are flat lookup tables; two intents in the game cause a real decision, both dev-only | Household, school and neighborhood responders now read recorded standing and each gained an intent where the NPC genuinely decides, with a durable trace |
| **D-02** relationship consequence is a two-entry table; 13 of 15 intents change nothing                             | Subjects declare their own effect from intent **and resolved outcome**; changes and significance both vary                                               |
| **D-03** audibility is the literal `"normal"`                                                                       | All three volumes are player-selectable on the production route                                                                                          |
| **D-04** `everyone` unreachable                                                                                     | Group address is offered where subject and room both support it; production gating stated in §15                                                         |
| **D-05** only the first eligible person can be addressed                                                            | Rooms return everybody eligible; the player chooses                                                                                                      |
| **D-06** every claim is `relationshipToTruth: "unknown"`                                                            | Deliberately unchanged — see §9                                                                                                                          |
| **D-07** no perception ever supersedes another                                                                      | Implemented, scoped by subject                                                                                                                           |
| **D-08** the formative/adult seam carries no explicit callbacks                                                     | Implemented — §10                                                                                                                                        |
| **D-09** legislation has no dialogue attached                                                                       | **Deferred**, per packet §H                                                                                                                              |
| **C-01** 19 duplicate option labels                                                                                 | Zero duplicates remain; option keys untouched                                                                                                            |
| **C-03** one outcome forecast in a description                                                                      | Fixed, and a test now rejects the class                                                                                                                  |
| **C-06** one line per intent, forever                                                                               | Variant banks per register                                                                                                                               |
| **C-07** no automated American-English guard                                                                        | Added, narrow, with the `council` false-positive explicitly protected                                                                                    |
| Improvement **#1** childhood → adult                                                                                | Implemented — §10                                                                                                                                        |
| Improvement **#15** conversation reads as five log lines                                                            | Implemented — §12                                                                                                                                        |
| Improvement **#22** a non-branching family                                                                          | `work.where-you-stand-there` now branches; every family does                                                                                             |

---

## 3. Production conversation reachability

**Before:** one subject (`household-obligation`), rendered by a household-specific
component, inside the ordinary-day surface.

**After:** three subjects, from one reusable surface, chosen by the world.

| Subject                       | Room     | Reachable when                                                                                    |
| ----------------------------- | -------- | ------------------------------------------------------------------------------------------------- |
| `household-obligation`        | kitchen  | somebody is on the same household record                                                          |
| `neighborhood-meeting-notice` | doorstep | somebody lives in the same place and not in the household                                         |
| `school-project-share`        | corridor | the character is enrolled and so is somebody else, at the same school, over an overlapping period |

`shared-intake-checklist` and `transit-access-pilot-provision` are deliberately
**not** wired. Their rooms need a briefing lead, a verifier and casework in
front of them, and the packet is explicit that an office must not be faked to
expose a subject.

**A defect the browser proofs found and fixed.** `PlayerConversations` was first
placed inside `OrdinaryDayView`, which the growing-up years deliberately do not
render — so a fifteen-year-old could reach no conversation at all, including the
one written for a school corridor. It is now rendered at the play-screen level.
Unit tests passed throughout; only the browser caught it.

---

## 4. Audibility, addressee and group address

### Audibility

Three volumes, player-selected, on the production route. Listener resolution is
the engine's own and unchanged.

Proven in a browser (`tests/e2e/conversation-controls.spec.ts`):

- all three offered at home, and the selection changes what the surface commits;
- in a school corridor an ordinary word reaches more people than a quiet one,
  and the screen says who by name rather than by count;
- private is unavailable in a corridor and the **room's own reason** is shown
  ("Neil is right there in the corridor"), not a greyed-out control.

`quietAmbientHearingPersonIds` is empty in every production room, deliberately.
The world records who is in a household or a class; it does not record who was
standing where. Claiming somebody overheard something would be inventing a fact
about a room, so a quiet word reaches the person it was said to and nobody else.

### Addressee

Rooms return everybody eligible. The school corridor returns both classmates,
because the world records who is in the class and never recorded which of them
the project partner is — letting the player choose is more faithful than
assigning one. The chosen person becomes the recorded `focus:respondent`.

### Group address

Offered when the subject supports it **and** the room has more than one eligible
person. `household-obligation` supports it; production world generation
currently puts one other person in a household, so the option is correctly
withheld rather than offered as a group of one. **This is context-gating, not a
missing control**, and it is the packet's own permitted disposition. It is the
same upstream world-generation limit 60A already pins.

---

## 5. Subject reachability — what the world has to supply

Nothing is announced as unavailable. A character with nobody at home has no
kitchen conversation; a `lives-alone` adult is asserted in test to have none.

**One world-generation change was made**, and it is the only one: a school that
this world already builds, and already enrolls the player in, now has **two
other children enrolled**. A school with one pupil in it is not a school, and it
was the reason an entire authored subject could never open — the corridor
existed, the enrollment existed, and there was nobody in the building. The
register claims what a register claims (other children attend the same school
over the same years) and nothing about who they are to this child.

---

## 6. NPC variation and autonomy

### Variation

Each household, school and neighborhood intent now has a bank in three
registers — warm, even, worn — chosen by `responseTone`, which reads only:

- how the last recorded interaction between the pair went;
- how many went badly versus well.

Both are records somebody wrote for their own reasons. Nothing consults the
player model, and a test asserts no decision trace contains any of its
vocabulary.

Each bank carries three interchangeable lines per register (≥3 per intent, as
required), selected through the existing `selectAuthoredVariant` rather than a
second variant engine. Every line in a bank means the same thing, because the
canonical record is written from the subject's commit contract and not from
whichever sentence came out.

### Real decisions

| Subject                       | Intent           | Options                            |
| ----------------------------- | ---------------- | ---------------------------------- |
| `household-obligation`        | `ask-for-time`   | take the week / decline it         |
| `school-project-share`        | `ask-to-split`   | split the work / decline the split |
| `neighborhood-meeting-notice` | `ask-them-to-go` | attend / keep the evening          |

All three go through `evaluateDecision` — the same evaluator the office has
always used — with `randomness: "none"`, `retention: "durable"`, and a recorded
trace. The office's own considerations were left where they were; a generic
primitive was extracted alongside them.

Considerations cite records rather than asserting a mood. Where the engine
required a citation it got one: `social:` sources carry a
`relationship-interaction` or a `life-history` reference to the counterpart's
own household-membership or commitment record. The engine refused a sourceless
social claim, which is the check working.

### Silence

`resolveQuietRoom` had one sentence, so every silence in the game was the same
silence. It now draws from a four-line bank keyed on the room and how long the
two of them have been at it. A test proves the same world says it the same way
twice.

---

## 7. Relationship consequences

`relationshipConsequenceFor` — the two-entry table — is gone. A subject declares
`relationship(intent, outcome)`, and the **outcome** is an input because being
agreed with and being refused are not the same exchange.

Measured on a real household exchange:

```
  raise-obligation  ->  maintained / minor
  offer-to-cover    ->  strengthened / meaningful
  ask-to-share      ->  strengthened / minor
  ask-for-time      ->  strained / minor      (they took it, with a limit)
                        strained / meaningful (they said no)
```

`RelationshipChange` is now the full canonical vocabulary, so an exchange that
settled something without moving anybody is recorded as `maintained` rather than
being rounded up or dropped. `significance` is derived, not the constant
`"meaningful"` it used to be.

The office pair (`reassure` → strengthened, `press` → strained) is preserved
exactly, now declared by the subject that owns it. Its existing test passes
unchanged.

---

## 8. Commitments and aftermath

### Commitments

Three intents now write a real `LifeCommitment` through the accepted machinery,
with `provenance: { kind: "simulated-event", eventId }` naming the exact turn
that created it — so a reader can go from "this person spends two hours a week
on this" back to the sentence in which they said they would.

`ask-for-time`, when the other person agrees, records the commitment **against
them**, not the player. The player asked; the other person is the one carrying
it.

### Aftermath

Uses `scheduleAftermath` and the accepted life-callback machinery unchanged — no
second timer, no second set of rules about what a promise is worth. Only
`AftermathContext.situationKey` was widened, to accept `conversation:<subject>`,
because calling a conversation a life situation would put a word in the record
that is not true.

Proven end to end: a household `ask-for-time` schedules a `life:callback`
naming its own conversation event, and `advanceWorld` resolves it with
`status: resolved, reasonKey: life:came-back`, writing the returning event.

**And the asymmetry is proven too.** `offer-to-cover` — taking somebody else's
week, the more generous-looking option — writes a commitment and schedules
**nothing**. That is deliberate: a game where every generous choice comes back
has promised a payoff for each of them.

**A latent bug this reached first.** `lifeCallbackTransitionHandler` wrote
`tags: ["life.callback", situationTag ?? "life.callback"]`, which world
integrity rejects as a duplicate. No origin lacked an `adult.` tag until a
conversation could schedule one. Fixed, and conversation subjects gained their
own return summaries.

---

## 9. Perceptions and claim truth

### Supersession

Implemented. The new perception names the one it replaces; the old record stays
exactly where it is.

Scoping is deliberately narrow: the subject key now carries the **conversation
subject** as well as the speaker, so an opinion formed at a doorstep cannot
silently overwrite one formed in a kitchen about the same person. A test asserts
that crossing subjects supersedes nothing.

### Claim truth

**Deliberately unchanged.** `relationshipToTruth` stays `"unknown"`. The packet
is explicit that lying must not be manufactured to populate the field, and the
repository has no truthful deception primitive to build on. Recording a truth
relation the world cannot establish would be exactly the invention this project
refuses everywhere else.

---

## 10. Childhood → adult callback

`growing-up.a-friend-over-years` reached adulthood already and required only
that the childhood stage had been _played_, so the years-later scene arrived in
identical words whatever the player had done at fifteen. That is referencing a
childhood in prose, which is what the eligibility contract exists to make
unnecessary.

Two adult stages now split on the childhood answer **by name**:

```
  still-there-later             requires after-choice   the-year-you-were-inseparable = go
  the-one-you-did-not-go-with   requires without-choice the-year-you-were-inseparable = go
```

Exactly one can ever exist in a life, both bind the same `familiar`, and both
carry the requirement in their own `causalInputs` with the records that answered
it. Measured, same seed, same person bound:

```
  childhood "go"    -> adult: still-there-later
  childhood "stay"  -> adult: the-one-you-did-not-go-with
```

**An emergent result worth naming.** The `familiar` role binds from a thread —
records naming both people — so a stranger cannot fill it. Talking to a
classmate in the new school corridor _is_ what creates those records. The
conversation work and the continuity work meet without either being written for
the other: you talk to somebody at school, they become somebody the world knows
you know, and years later the game can ask you about them.

### The without-choice branch

`work.where-you-stand-there` was the one family with no option branching at all,
and its `the-offer` stage said somebody had heard how you handled that morning
while requiring only that the morning happened — offered identically to a player
who had passed the decision upwards and never handled it. It now requires that
you decided, and a new `it-came-back-down` stage is what happens when you did
not, which also closes the dead end that made escalating the one answer with
nowhere to go. Every family now branches on an answer.

---

## 11. Copy hygiene

| Defect                            | Before                                            | After                                                                                  |
| --------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Duplicate option labels           | 30 (six "Say no", three "Go", three "Take it", …) | **0**                                                                                  |
| Labels under 10 characters        | 27                                                | 1 ("Call them", natural and distinctive — the packet says not to inflate mechanically) |
| Outcome forecasts in descriptions | 1                                                 | **0**, and a test rejects the class                                                    |
| British idiom in authored copy    | "fortnight" ×8, "the bins", "the post"            | **0**, and a test rejects the class                                                    |

**Option keys are untouched.** A test names five episode keys and five adult
keys that were relabelled and asserts each still exists, because keys are what
saves and replays resolve and a renamed one would silently break a stored life.

The forecast guard is deliberately narrow. Ten shipped descriptions use "will"
or "would" legitimately — "They will be annoyed", "It will take months either
way" — because a known cost of an option is part of what the option is. What is
banned is _hedged prediction of the consequence_. Both the banned and the
allowed forms are pinned in the test.

The idiom guard reads quoted strings rather than raw source, because `aftermath`
contains "maths" and `flatMap` contains "flat"; and it strips comments, because
the questionnaire bank's doc comment explaining the "central ministry" fix is a
record of a repair, not the defect. `council` is deliberately absent from the
list — American municipalities have councils and this game is about local
government — and a test asserts the guard does not fire on them.

---

## 12. Journal and threads

### Conversations

Conversations never reached the journal at all: entries require a `choice.` tag
and a turn does not carry one. They now group on the `conversation.session.<key>`
tag the turns themselves carry, so the grouping is established by the record
rather than inferred from events being near each other. Every turn stays anchored
to the entry.

That needed a real fix underneath. A session descriptor keys off the history
frontier when it is built, so rebuilding it after each turn minted a new key and
one exchange claimed to be five. A continuing conversation now carries the
frontier its first turn was written at; one resumed on a later day is correctly
a new conversation.

The summaries were also the engine talking about itself — "X used a raise
obligation approach; Y continued". Those words are subject-relative (`deferred`
means the other person put it off in an office and means they took the week on at
home), so no central mapping could be right for both. The subject now says how
its own turn landed. A journal entry reads:

> Christian Workman brought up the week's errands with Cole. Idris Cole said they
> had been avoiding it too. Christian Workman offered to cover the week
> themselves. Idris Cole let them take it.

### Threads

Threads that have gone quiet now appear, said as a person would say it — "You and
X have not spoken in a long time" — rather than the word the index uses for that
state. They come after the moving ones and never crowd them out. Leaving them out
meant a player could not tell something settled from something nobody had
mentioned in two years. A test asserts no open-thread sentence contains
`dormant`, `pressing`, `standing`, `thread` or `salience`.

---

## 13. Explicitly deferred, and why

| Deferred                                                                | Why                                                                                                                                                    |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Legislative conversation → vote plan / bill (60C D-09, #17)             | Packet §H: belongs to the legislation lane after #79                                                                                                   |
| Campaign and candidacy dialogue                                         | #85 owns it                                                                                                                                            |
| Graphics, scenes, people in rooms                                       | #86 owns it                                                                                                                                            |
| Causal inspector UI and export                                          | #84 owns it                                                                                                                                            |
| A deception / lying system (60C #18)                                    | Packet §D.2: must not be manufactured; no truthful primitive exists to build on                                                                        |
| Bereavement and mortality content (60C #21)                             | Packet §H: needs the accepted mortality system made player-reachable in its own lane                                                                   |
| NPC-initiated conversations (60C #16)                                   | Optional in the packet. No clean bounded design fell out of the future-due machinery without disturbing the atomic turn contract, so it was not forced |
| Real-time interrupts / overlapping speech                               | Would require replacing the atomic deterministic turn contract                                                                                         |
| Re-authoring the 15 `policy-docket-flagged` calibration items (60C #25) | Research lane owns the questionnaire bank's authority                                                                                                  |

---

## 14. Evidence

| Check                                              | Result                                                                                                                  |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `npm run validate`                                 | **Passed** — format, lint, typecheck, **1,451 tests across 90 files**, build, deterministic demo replay, art validation |
| `tests/dialogue-reachability.test.ts`              | **24 passed** — the packet's twenty proof requirements                                                                  |
| `tests/e2e/conversation-controls.spec.ts`          | **7 passed** in a real browser                                                                                          |
| `tests/content-american-english.test.ts`           | 3 passed, including one that fires on the four phrasings that actually shipped                                          |
| `src/presentation/life-opacity.test.ts`            | Forecast guard added; pins the violation and the allowed forms                                                          |
| `npm run report:life -- packet70-final 0 5`, twice | **Byte-identical**, 13,529 bytes                                                                                        |
| `git diff --check`                                 | Clean                                                                                                                   |
| `tests/narrative-wave-ownership-boundary.test.ts`  | Passes; carve-outs for #83/#84/#85/#86 intact                                                                           |
| Full Playwright suite, 18 spec files               | **141 passed**, 0 failed                                                                                                |

The ownership boundary was widened to the conversation surfaces this packet
grants, and the widening is documented in the test itself. **No carved-out
surface moved.**

### What the full browser suite caught that nothing else did

The unit suite and the new focused specs were green before the whole Playwright
suite was run. Running it found three existing browser tests this work broke,
all of which are worth writing down, because two of them are the sort of thing a
packet can quietly hide.

1. **`pennywise-adaptive-life.spec.ts` — "keeps the ordinary day beside the
   decision".** It asserted `household-conversation` was visible. That test id
   belonged to the single hard-wired panel this packet deleted. The assertion
   now names `conversation-household-obligation`, which is the same conversation
   reached the production way. The test's claim is unchanged: the kitchen is
   still beside the decision.

2. **`production-play.spec.ts` — "keeps a household conversation settled after a
   reload".** The same dead test id, plus a real hazard behind it: the test read
   `conversation-topic`, `conversation-intents` and `conversation-briefing`
   unscoped, and a day now draws up to three conversations, each with all three.
   Every one of those locators was about to become ambiguous. They are now
   scoped to the kitchen conversation, so the test proves what it says it does
   rather than whichever conversation the page happened to render first.

3. **`run-b.spec.ts` — "presents Listen as a non-spoken action".** It pinned the
   exact sentence a silent turn produced: _"The room settles. No one adds
   anything yet."_ This packet replaced that single hard-coded line with a bank
   of four the world selects from deterministically, which is the variation the
   packet asked for — so the old assertion was pinning the defect. It now
   asserts the thing that actually matters: that a `.conversation-room-narration`
   appeared and **no `blockquote` did**, so nobody spoke; that the turn was still
   recorded (event count 3) with no new claim in it (claim count stays 2); and
   that the transcript carries **the same sentence the room got**, captured from
   the page rather than typed into the test. That is a stronger proof than the
   string it replaced.

None of the three was repaired by deleting an assertion, and none was skipped.

An earlier full-suite run reported 58 passed and a long tail of
`ERR_CONNECTION_REFUSED`: the dev server died partway through 141 tests and
every test after it failed to connect, including a legislation test that timed
out rather than failing an assertion. Re-running those specs against a standing
server passed all 34. That cascade is recorded here so the numbers above are not
mistaken for a suite that was flaky and then agreed with us.

---

## 15. Known limitations

1. **Group address is context-gated in production.** The control and the
   subject support it; production households contain one other person, so it is
   correctly not offered. Same upstream world-generation limit as 60A's pinned
   gap. Proven reachable at the engine and view level.
2. **Two cold starts still produce similar life shapes.** Unchanged from 60A,
   still upstream in `generateQuickCharacterHistory`, still pinned by a
   failing-when-fixed test.
3. **The office and legislative subjects remain dev-only**, deliberately.
4. **`relationshipToTruth` still carries no information**, deliberately.
5. **The neighbor and the classmate can be the same person** in a small
   generated world. Both roles are truthfully derived — same place, not the same
   household; same school, overlapping years — and a small town where your
   neighbor is in your class is not wrong. It is a consequence of the world
   having few people in it.
6. **Aftermath from a conversation is currently limited to two intents.** More
   would need authored return summaries per subject, which is content work
   rather than machinery.

---

## 16. Later reconciliation notes

- **#86 (graphics)** branches from `6311dd6` and is current with main. This
  packet added `src/player/PlayerConversation.tsx` and touched
  `src/player/PlayerGame.tsx` and `src/player/player.css`. #86 also touches
  `PlayerGame.tsx` and `player.css`, so those two are the expected conflict
  points; the new component is additive. Every conversation beat now carries its
  room, its bound people and its place, which is what #86's surface binding
  needs to choose a scene.
- **#83/#84/#85** still branch from `b986fbe`, before the #82 graphics merge,
  and still show ~25,000 deletions against current main. Unchanged by this
  packet and worth knowing before any of them is taken.
- **#84 (causal inspector)** — every new record added here carries explicit
  provenance: commitments name their conversation event, aftermath due items
  name it in `entityIds` and provenance, perceptions name the claim and
  knowledge they came from and the perception they replace, and decision traces
  cite the records they weighed. Nothing needs an inferred edge.
- **#79 (legislation)** — the legislative conversation subject is untouched and
  still records no causal edge to any bill. That seam is deliberately left open.

---

## 17. Acceptance state

**Not accepted. PR #87 remains a draft and remains unmerged**, as both packets
require.

Every gate the packet named has been run and is green: `npm run validate`
(1,451 tests across 90 files), the focused dialogue-reachability suite, the
complete Playwright suite (141 tests, 18 spec files, 0 failed), the report
replayed twice byte-identically, and `git diff --check`.

What a human should do with it:

1. `npm run dev`, New Game, age 34. There should be two conversations on the
   screen — one at home, one on the doorstep — with controls for how loudly you
   say it and, at home, who hears it.
2. Start a fifteen-year-old in childhood. There should be a school corridor with
   two classmates in it, a choice of which one to go to, and a private option
   that is off with a sentence saying why.
3. At home, raise the week and then ask them to take it. Watch whether they
   agree — and start a second life and watch whether they answer differently.
4. Then press "Let time pass" a few times and see whether it comes back.
5. Open the journal. The conversation should be one entry, not five.

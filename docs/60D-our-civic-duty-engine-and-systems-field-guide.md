# 60D — OUR CIVIC DUTY

# ENGINE AND SYSTEMS FIELD GUIDE

## OWNER PRINT EDITION

**Written for:** Lamontae Billing
**Date:** 2026-09-04
**Purpose:** to let you understand what this game is and how it works **without
reading any code**
**Measured against:** accepted main `6311dd6` plus the open unmerged wave branch
`claude/pr81-narrative-graphics-lifeflow-t8j8oe` (PR #87, draft)
**Companion documents:** 60A (completion report), 60B (visual audit), 60C (dialogue audit)

---

## A NOTE BEFORE YOU START

This document is long on purpose. It is meant to be printed, read in order the
first time, and then used as a reference. You do not need to read code to use
it. Where a file is named, it is named so you _could_ go and look — not because
you need to.

Three things are true about this project that make it unusual, and they explain
most of what follows:

1. **The game never invents a fact.** Everything a player is shown is either
   authored prose or something read out of a record the world actually wrote.
   When the game does not know something, it says so instead of guessing.
2. **The game is deterministic.** The same seed and the same choices produce the
   same life, every time, on any machine. This is what makes bugs findable and
   what makes the replay tests meaningful.
3. **A lot of the engine is built and not connected.** This is the single most
   important thing to hold in your head while reading. There is far more working
   machinery in this repository than a player can currently reach. Chapter 11
   ("THE ENGINE'S UNUSED MUSCLE") is a full accounting.

### The five status labels

Every claim in this guide carries one:

| Label                | Meaning                                                                         |
| -------------------- | ------------------------------------------------------------------------------- |
| **[MAIN-PLAYABLE]**  | On accepted main. A player meets it in ordinary play.                           |
| **[MAIN-SUBSTRATE]** | Merged and working, but only a developer route, a script, or a test reaches it. |
| **[OPEN-PR #n]**     | Real code on an open, unmerged branch. **Not shipped.**                         |
| **[BANKED]**         | Research, corpora, or art that exists but nothing consumes.                     |
| **[MISSING]**        | Does not exist.                                                                 |

---

# TABLE OF CONTENTS

```
  PART ONE — THE OWNER'S CHAPTERS
     1.  WHAT HAPPENS WHEN I CLICK ADVANCE TIME?
     2.  HOW A DIALOGUE TREE ACTUALLY WORKS HERE
     3.  HOW EVENTS ACTUALLY WORK
     4.  HOW NPCS KNOW THINGS
     5.  HOW THE GAME REMEMBERS MY LIFE
     6.  HOW PENNYWISE LEARNS ABOUT THE PLAYER
     7.  HOW THE GAME CAN CREATE A 50-YEAR LIFE WITHOUT A SCRIPT
     8.  HOW SAVES WORK
     9.  HOW GRAPHICS ARE SUPPOSED TO WORK
    10.  WHAT IS ACTUALLY DYNAMIC TODAY?
    11.  THE ENGINE'S UNUSED MUSCLE
    12.  WHAT WOULD BREAK IF WE DID THIS WRONG?
    13.  HOW I CAN TEST THIS GAME WITHOUT READING CODE

  PART TWO — THE DIAGRAMS
     A.  The shape of the whole thing
     B.  What happens on Advance Time
     C.  How one beat is chosen
     D.  What one conversation turn writes
     E.  How a narrative thread is formed
     F.  How Pennywise learns
     G.  How a save is written and read
     H.  How a fifty-year life is composed without a script

  PART THREE — THE SYSTEMS CATALOGUE  (44 systems, 11 points each)

  PART FOUR — GLOSSARY
```

---

# PART ONE — THE OWNER'S CHAPTERS

---

# CHAPTER 1 — WHAT HAPPENS WHEN I CLICK ADVANCE TIME?

In the shipped game the button says **"Let time pass"** (or, during the growing-up
years, **"Let the year run on"**). Underneath, this is the most carefully guarded
operation in the whole engine, and it is worth understanding in detail because
almost everything else hangs off it.

## Step by step

**Step 1 — The surface decides how far to jump.**
`letStoryTimePass()` asks `quietStepDays(fromDate)` how many days this particular
quiet stretch should be. The answer rotates deterministically through
**31, 47, 78, 124 days**. **[OPEN-PR #87]**

> _Why four numbers instead of one?_ Before this wave it was a fixed 45 days, and
> four consecutive quiet stretches read as literally identical — "a month and a
> half later" four times in a row. Rotating through four values makes four quiet
> gaps feel like four different gaps without inventing a fact about anybody's
> life. The formative years use their own `formativeStepDays()`.

**Step 2 — `advanceWorld` is called with a handler registry.**

```
  advanceWorld(world, days, LIFE_TRANSITION_HANDLERS)
```

The third argument matters enormously. It is a registry of _who is allowed to
handle a scheduled thing that becomes due during this jump._ The life surfaces
pass `LIFE_TRANSITION_HANDLERS`, which registers exactly one key:
`"life:callback"`. The legislative surface passes `HEARING_HANDLERS`, which
registers exactly one key: the committee-hearing key. **[MAIN-PLAYABLE]**

**Step 3 — The days are validated and the new date computed.**
`advanceWorld` refuses a non-positive or non-integer number of days, asserts the
world is internally consistent _before_ touching it, and computes the new date
and the new "moment" (date plus minute-of-day plus time zone plus UTC offset).

**Step 4 — Everything scheduled in that window is resolved, in order.**
This is `resolveFutureDueItemsThrough(world, nextDate, registry)`, and it is the
heart of the operation.

```
  FIRST: check that EVERY item due in this window has a handler.
         If even one does not, THROW before changing anything:
           "Missing future-transition handler for due item <id>: <key>"
```

> _Why refuse rather than skip?_ Because a scheduled item is a consequence the
> world already committed to. Silently stepping over one would lose a promise the
> game made. The code comment says it plainly: _"advanceWorld refuses to step over
> a due item it has no handler for, which is right: silently skipping one would
> lose a consequence the world had already committed to."_

Then, in a loop, always taking the **earliest** remaining due item:

```
  a. Build a world whose clock reads the item's DUE DATE, not the target date.
     (So a thing that comes due on day 40 of a 78-day jump happens on day 40.)
  b. Call the handler.
  c. Verify the handler did not mutate its input world.
  d. Verify the handler did not change the world's identity, its date, or its
     action sequence.
  e. Verify the handler did not rewrite any existing due-item history.
  f. Verify anything the handler scheduled is NEW and in state "scheduled".
  g. Assert the whole world is still internally consistent.
  h. Write a terminal state for the item (fulfilled / lapsed / etc.) with a
     reason and, when there was one, the id of the event it produced.
  i. Loop. A handler may schedule further items, and if one of those is also
     due inside this window, it resolves too.
```

Those six checks (c–g) are the reason time advance is trustworthy. A handler
physically cannot cheat.

**Step 5 — The action sequence is bumped and one event is written.**
`advanceWorld` records a `simulation.time-advanced` event tagged
`simulation.time`. This is why the journal knows time passed even when nothing
else happened.

**Step 6 — The surface re-projects.**
`projectStoryMoment(world, personId)` runs again against the new world and
produces the next beat. Nothing is cached; the screen is always a fresh reading
of canonical state.

## What actually comes due today

Only one kind of thing: **a life callback**. When you made a choice earlier that
carried an _aftermath_ — an obligation, a grievance, goodwill, or standing —
`scheduleAftermath` put a dated item in the world. The delays are:

```
  obligation ..........  96 days
  grievance ........... 187 days
  goodwill ............ 251 days
  standing ............ 314 days
```

The code is explicit that these are **pacing numbers, not research**:

> _"Presentation pacing, and labelled as such. There is no survey that says how
> long a favour stays owed, and the research is explicit that inventing one would
> be worse than admitting the gap. What these numbers do is stop everything
> landing in the same month."_

When the item comes due, `lifeCallbackTransitionHandler` asks the counterpart's
own recorded history whether they would raise it, and either writes an event
("it came back") or closes the item with one of five honest reasons:

```
  life:nobody-to-carry-it   nobody is left who would carry it
  life:nobody-heard         it happened where nobody could hear it
  life:issue-overtaken      the thing it was about has ended
  life:actor-lost-standing  the person is no longer in a position to act
  life:attention-moved      attention moved on
  life:came-back            it came back
```

## The one-sentence answer

**Clicking "Let time pass" moves the clock by a rotating number of days, resolves
every dated consequence that falls inside that window in the order it was due —
refusing to skip any it cannot handle — writes a time-advanced event, and asks
the world for the next beat.**

---

# CHAPTER 2 — HOW A DIALOGUE TREE ACTUALLY WORKS HERE

The honest headline: **this game does not have dialogue trees in the usual
sense.** It has two different things, and they are better than trees in one way
and much worse in another.

## What a dialogue tree normally is

A tree is a fixed graph the writer draws: node → choices → nodes. The whole
conversation is known in advance. Adding one choice means redrawing part of the
tree.

## What this game has instead

### Thing one: a turn-based conversation engine

Every turn, the game asks the **subject** in front of the player what can be said
right now. The subject answers with a list of intents. The player picks one, and
picks who to say it to and how loudly. That combination is committed as a turn.

There is no tree because there is no fixed graph. What can be said next depends
on what the subject says is available, which depends on the progress so far.

```
  SUBJECT (e.g. "household-obligation")
      |
      +-- offers intents:  raise-obligation, offer-to-cover,
      |                    ask-to-share, ask-for-time, listen
      |
  PLAYER picks one, plus an addressee, plus an audibility
      |
  ENGINE resolves who could hear it
      |
  RESPONDER produces the NPC's line
      |
  ENGINE writes: event, claim, knowledge (x2 kinds), perception,
                 and (for 2 intents only) a relationship interaction
      |
  SUBJECT updates its progress -> a different set of intents next turn
```

The **five subjects** are: a constituent referral in an office, a bill provision
with a briefing lead, who does the errands at home, who does which half of a
school project, and a notice about a neighbourhood meeting.

**In the shipped game, only the household one is reachable.** The other four are
real, tested, and behind a developer route. **[MAIN-PLAYABLE]** for one;
**[MAIN-SUBSTRATE]** for four.

### Thing two: authored beats with requirements

Most of what feels like dialogue in this game is not the conversation engine at
all. It is a **beat**: a paragraph of authored prose and two to four buttons.
There are 139 of them across four banks, with 436 options between them.

The clever part is not the beat. It is **why the beat was offered**, and that is
where this game beats a tree.

## The requirement grammar — the real branching system

An episode stage declares what must be true before it can be offered. There are
**ten kinds** of requirement:

```
  fact               a named fact about this life holds right now
  absent             a named fact does NOT hold
  age-at-least       the person is at least N
  age-below          the person is under N
  role               somebody real can fill a named part
  after-stage        an earlier stage of THIS run was played
  without-stage      an earlier stage was NOT played
  after-choice       an earlier stage was played AND a named option chosen
  without-choice     an earlier stage was played and that option was NOT chosen
  days-since-stage   at least N days have passed since a named stage
```

`after-choice` is the important one. It means a scene eight months from now can
depend on **the exact button you pressed** eight months ago. That is what a tree
gives you, except it is expressed as a condition rather than an edge, so the same
stage can be reached by many different histories without anybody drawing them.

## A worked example, from a real traced life

Seed `audit-seed`, a 34-year-old called David Riley in Kentucky. The first beat
was:

```
  home.the-week-that-does-not-balance / the-first-time-it-is-said

  WHY IT WAS OFFERED (every reason kept separately, with its records):
    role role=household-companion
        "household-companion is Amir Ruiz: Resident on the same household record."
        records: household-membership_780a02c3c628815f
    age-at-least age=18
        "Age 34; needs at least 18."
        records: none (a negative or age requirement)
    fact fact=household.shared
        "household.shared: Somebody else is on the household record."
        records: household-membership_780a02c3c628815f

  WHAT THE PLAYER READ:
    "Amir Ruiz says, not for the first time but for the first time out loud,
     that the week does not divide evenly. They are right, and they have picked
     a bad evening to be right on."

  THE BUTTONS:  take-it-on | explain | pay-for-it | later
```

Nobody wrote "if the player has a housemate, show this scene." The scene declared
three requirements, the world happened to satisfy all three, and the report can
name the exact record that answered each one.

## What this means for you

- **Adding content does not require redrawing anything.** A new family declares
  its own requirements and joins the pool.
- **The game can always explain itself.** Every offered beat carries its reasons
  and the record ids behind them.
- **The weakness is on the conversation side, not the beat side.** Four of the
  five conversation subjects return one fixed line per intent, forever. See 60C
  finding D-01.

---

# CHAPTER 3 — HOW EVENTS ACTUALLY WORK

An **event** is the game's atom of "something happened." Almost everything else
is derived from events.

## What an event carries

```
  id                  assigned by the store
  stableKey           a deterministic key the writer chooses; two writes with
                      the same stableKey are the same event, which is what makes
                      replay work
  type                what kind of thing happened
  occurredAt          when it happened (in-world)
  recordedAt          when the world learned of it
  jurisdictionId      where
  involvedEntityIds   every entity this touches
  participants[]      { personId, role, detail } — see below
  visibility          public | limited | private
  tags[]              machine-readable labels
  summary             one sentence, in the world's voice
  context             location, socialContext, pressure, choice, motivation,
                      immediateReaction
```

## Participant roles — the part most people miss

A participant is not just "someone who was there." Each carries a role that says
_how_ they were involved:

```
  agency:initiator        did the thing
  presence:participant    was present and part of it
  focus:respondent        answered
  focus:addressee         was spoken to
  observation:listener    was nearby and reasonably heard it
```

This distinction is what lets the game later say "you were there" versus "you did
it" versus "you overheard it" without guessing. **[MAIN-PLAYABLE]**

## Events are append-only

The history store appends. Nothing is edited, nothing is deleted. A later state
record supersedes an earlier one; the earlier one stays. This is why:

- the journal can show a life in order without a separate log;
- a save is just the world, because the world contains its own history;
- replaying a seed reproduces a life exactly.

## Tags are how systems find each other

Some tags you will see, and what they mean:

```
  simulation.time                       the clock moved
  choice.<optionKey>                    the player chose something
  episode:<familyKey>                   this belongs to an episode family
  episode-stage:<stageKey>              which stage
  episode-instance:<instanceKey>        which RUN of that family, with whom
  conversation.intent.<intent>          what was said
  conversation.audibility.<level>       how loudly
```

The `choice.` tag is load-bearing in a way worth knowing: the play surface
decides whether a life has started at all by asking whether any event carries a
`choice.` tag. Before this wave it counted any event, which is why a brand-new
character's very first screen once read _"18 years later, and Nadia Arnold is
34"_ — the world-building events looked like lived time. **[OPEN-PR #87]**

---

# CHAPTER 4 — HOW NPCS KNOW THINGS

This is one of the strongest parts of the engine and it is worth understanding
because it is unusual.

## Three separate ideas, deliberately kept apart

```
  1. WHAT HAPPENED          the event          (canonical truth)
  2. WHAT SOMEBODY LEARNED  the knowledge      (may be wrong)
  3. WHAT SOMEBODY THINKS   the perception     (an opinion, with a source)
```

Most games collapse these into one "reputation" number. This one does not, and
that is why an NPC can be wrong about something without the world being wrong.

## Knowledge

When something happens, the game writes a knowledge record for each person who
learned about it. Crucially, **how they learned it changes the record**:

```
  I WAS THERE                        I WAS TOLD
  ---------------------------        ---------------------------
  accuracy:   "accurate"             accuracy:   "unknown"
  confidence: "high"                 confidence: "high"
  source:     { kind: "direct" }     source:     { kind: "told-by",
                                                   sourcePersonId,
                                                   claimId }
```

That `accuracy: "unknown"` on hearsay is the whole point. The game refuses to
record that somebody _knows_ a thing merely because they were told it. It records
that they were told it, by whom, and in which claim. **[MAIN-PLAYABLE]**

## Claims

A **claim** is a thing somebody said. It carries the speaker, the event it
attaches to, when it was made, its audience (public / limited / private), the
statement itself, its provenance, and a field called `relationshipToTruth`.

Today `relationshipToTruth` is always `"unknown"` — because no NPC in the game
lies yet. The field exists so that when one does, everything downstream already
knows how to handle it. **[MAIN-PLAYABLE]** with the caveat noted in 60C (D-06).

## Perceptions

A **perception** is an opinion one person holds about another, or about a thing.
It carries what it is about, the assertion, a confidence, a credibility rating for
the source, and a link back to the claim and knowledge record that produced it.

```
  subjectKind        "entity:conversation-position"
  subjectKey         conversation-response:<personId>
  assertion          "Ruiz accepted the offer and said it counted."
  confidence         "medium"
  sourceCredibility  "medium"
  source             { kind: "heard-claim", claimId, knowledgeId }
```

Every perception can be traced back to the exact sentence that caused it. Nothing
is a free-floating number.

## Who hears what

When somebody speaks, the game works out who could actually hear it:

```
  NORMAL   everyone in the room
  QUIET    the person addressed, plus anyone close enough to catch it
  PRIVATE  only the person addressed — and only if the room allows privacy at all
```

If privacy is not possible, the game refuses the turn and tells you why, using
the room's own reason rather than a generic error. **[MAIN-SUBSTRATE]** — the
control that would let a player choose is not wired into the shipped game
(60C, D-03).

## The honest summary

The game's model of "who knows what" is genuinely good and mostly unused. In
shipped play, the only conversation that can happen is one household exchange at
normal volume, so the machinery writes correct records that nothing yet reads
back in an interesting way.

---

# CHAPTER 5 — HOW THE GAME REMEMBERS MY LIFE

Everything the game remembers is in one place: `world.history`. There is no
second store, no cache, no "save data" that differs from the world.

## The record types

```
  events                 something happened
  claims                 somebody said something
  knowledge              somebody learned something
  perceptions            somebody formed an opinion
  memories               a person carries something away
  relationshipInteractions   two people did something to each other
  relationshipMoments    a notable point between two people
  futureDueItems         something scheduled
  futureDueItemStates    what became of it
  workItems              a task
  decisions / decision traces   an NPC's reasoning, preserved
  appraisals             how somebody rated something
  temporaryStates        a state that is true for a while
  commitments            a promise with hours attached
  ... and the whole life substrate: households, kinship, partnerships,
      care responsibilities, work relationships, education enrollments,
      organization participations, housing, resources, vitality
```

## Two things the game reads back for you

### The journal **[OPEN-PR #87]**

`projectLifeRecord()` reads the same canonical history the play surface reads and
arranges it into **chapters of four years each**, plus a list of who is in this
life and what is still open. Nothing is stored twice — the journal is a _view_,
not a log.

It also refuses to show noise: `readable()` suppresses any entry whose summary is
under twelve characters, on the grounds that a two-word record is a machine
artefact, not a memory.

### Narrative threads **[OPEN-PR #87]**

A **thread** is the game noticing that several records belong together. From the
traced `audit-seed` life:

```
  promise:Joel Riley                    [opening]
  kin:Joel Riley                        [running]
  promise:Something decided earlier     [opening]
  household:Amir Ruiz                   [running]
  civic:Community Service Club          [opening]
  companionship:Dylan Butler            [dormant]
  companionship:Elijah Vargas           [dormant]
```

**The rule that makes threads trustworthy:**

> _Two records being near each other in time is not a link._

A thread exists only where records share a declared basis: the same person, the
same organization, the same record, or the same stable key. Adjacency is never a
link. This is why the game can promise that a thread means something.

Threads go **dormant** after 400 days with nothing new, and they are never
deleted. "Dormant" is a real state a life has; deletion would be a lie.

## Recurring people

The same traced life reports:

```
  Joel Riley (4)      Amir Ruiz (2)      Dylan Butler (2)      Elijah Vargas (2)
```

Those counts are how many separate threads each person appears in. That is how
the game knows who matters in a life without anybody scoring relationships.

---

# CHAPTER 6 — HOW PENNYWISE LEARNS ABOUT THE PLAYER

"Pennywise" is the internal name for the **player model** — the game's picture of
how _you_ play, kept deliberately separate from anything your character is.

## What it tracks

Fourteen dimensions in two groups:

```
  EIGHT CIVIC                          SIX LIFE
    econ-distribution                    decision-style
    social-pluralism                     personal-ties
    institutional-trust                  achievement-ambition
    civic-order                          security-stability
    governance-scale                     risk-appetite
    security-posture                     care-obligation
    ecological-priority                  privacy-preference
    (plus one more civic axis)
```

Each dimension has two named poles, so it is a position between two defensible
views, not a score out of ten.

## Evidence has three strengths

```
  SETUP     0.25    you said this before the game started
  STATED    0.6     you said this in the game
  ENACTED   1.2     you DID this, in a world that could answer back
```

Doing something is worth roughly five times saying it. That single ratio is what
keeps the model from being a personality quiz.

## What the calibration actually does

The opening questionnaire is not a fixed list. It:

- always asks **three fixed openers** first (`kitchen_late`,
  `marcus_and_the_trip_fund`, `priya_reference`);
- then picks each next question by **marginal information value** — what would
  this answer actually tell us that we do not already know;
- applies a **register gate** so it does not ask five policy questions in a row
  (there are six registers: lived-personal, lived-relational, lived-moral,
  civic-lived, policy-lived, policy-docket);
- **stops** when the best remaining question is worth less than 0.9;
- breaks ties with a SHA-256 over the world seed, person, bank and version, so
  the same player always gets the same questionnaire.

Measured: three different answer patterns produced **19, 22 and 37 questions**.
The traced `audit-seed` life stopped at 19 with the reason
`information-gain-floor` and a best-remaining question worth 0.87.

**There is no progress bar, deliberately.** A bar would have to lie about a
length the game does not know.

## Reading a real trace

From `npm run report:life -- audit-seed`:

```
  1. kitchen_late (lived-personal) — chose `sit-down`, selected by fixed-opener
       personal-ties:      0.000 -> 0.500   (weight 0.00 -> 0.25)
       care-obligation:    0.000 -> 0.350   (weight 0.00 -> 0.25)
       privacy-preference: 0.000 -> -0.200  (weight 0.00 -> 0.25)

  4. ray_car (lived-personal) — chose `say-thursday`, selected by disambiguation
       next best was `career_evenings`
       decision-style:     0.000 -> 0.400   (weight 0.00 -> 0.23)
       security-stability: 0.000 -> 0.300   (weight 0.00 -> 0.23)
```

Note "selected by": every question records **why it was asked** —
`fixed-opener`, `disambiguation`, or `coverage-need` — and what the runner-up
was. Nothing about the selection is hidden.

## And after the life starts

The same fourteen dimensions keep moving, but now from gameplay. The end of the
traced life:

```
  dimension              mean    fromSetup  fromGameplay
  personal-ties          0.377       7           3
  care-obligation        0.427       4           3
  security-stability     0.327       4           3
  achievement-ambition  -0.063       4           2
  privacy-preference     0.033       5           2
  econ-distribution      0.426       4           1
  civic-order           -0.100       6           0
  governance-scale      -0.300       2           0
```

You can see the model shifting from setup evidence to lived evidence as the life
goes on. That is the design working.

## What Pennywise is for, and what it is not for

**It is for:** deciding which of several eligible beats to offer, so the game puts
in front of you the things you have shown it you engage with — including, by
design, things that **cross-pressure** you rather than only confirm you.

**It is not for:** telling you about yourself. None of it appears on any player
surface. There is a test (`life-opacity.test.ts`) that fails the build if words
like `salience`, `confidence`, `weight`, `dimension`, `cross-pressure`, `dormant`,
`stakes`, `pressing` or `notable` ever reach a screen. **[OPEN-PR #87]**

---

# CHAPTER 7 — HOW THE GAME CAN CREATE A 50-YEAR LIFE WITHOUT A SCRIPT

This is the question the whole architecture answers. Here is the answer in six
moves.

## Move 1 — A life is a set of facts, not a plot

The world records who you live with, who you are related to, where you work, what
you belong to, what you owe, what you look after. Nobody writes a story. The
story is what happens when authored beats meet those facts.

## Move 2 — Every beat declares its own conditions

No beat is scheduled. Each declares requirements, and becomes available when the
world satisfies them. `home.the-week-that-does-not-balance` needs a housemate and
an adult; `care.the-person-you-look-after` needs somebody being cared for. As a
life changes, different beats become possible without anybody re-planning.

## Move 3 — Roles are bound to real people

An episode does not say "your friend." It says it needs a `household-companion`,
or a `relative`, or a `familiar`, or a `colleague`, or a `community-member`, and
the game binds a real person from a real record. The report names them: _"Amir
Ruiz: Resident on the same household record."_

A specific fix from this wave: `familiar` used to be able to bind a parent, which
made "somebody you know from around" mean your mother. It now excludes household
and kin threads and anybody already bound closer to home. **[OPEN-PR #87]**

## Move 4 — One ranking, three sources

Every turn, formative beats, adult situations and episode stages are ranked
together by one selector:

```
  1. hard eligibility        can this happen at all?
  2. causal availability     is it due because of something that happened?
  3. relevance               does it engage what this player engages with?
  4. cross-pressure          does it push against them, not just confirm them?
  5. novelty guard           has this been seen too recently?
  6. pacing guard            is the rhythm right?
  7. SHA-256 tie-break       deterministic, so the same life repeats exactly
```

From the traced life, the selector says why each time:

```
  Beat 1: episode, 3 candidates (2 composed, 1 authored)
          reason: cross-pressure.  "The player model decided the ranking."
  Beat 2: adult,   2 candidates (1 composed, 1 authored)
          reason: current-relevance.
          "The beat was causally due; the player model did not decide it."
```

That second line matters: when something is _causally_ due, the player model
stands down. A consequence is not a preference.

## Move 5 — Choices leave things behind, and the clock brings them back

An option can carry an aftermath (obligation / grievance / goodwill / standing).
If there is somebody to hold it and a route by which they would come up in your
week, it is scheduled 96–314 days out. When time passes over that date, the
counterpart's own record decides whether they raise it.

**Most options carry nothing**, and the code insists on that: _"The commonest
case, and it must stay the commonest case. Most of what a person does is finished
when they have done it."_

## Move 6 — The gaps get narrated honestly

Between beats, `composeConnectiveNarration()` writes the connective tissue: how
much time passed, what is still open, who has been around. It only writes a
"steady state" line when _nothing actually moved_ and the gap is at least 25
days — otherwise it would say "things went on as they were" after a month in
which three things happened.

## Putting it together — 50 years

```
  age 5 ..... 18    formative bank: 19 situations, 49 options
                    plus growing-up.a-friend-over-years spanning years
  age 18 .... 70+   adult bank: 35 situations, 102 options
                    episode bank: 9 families, 32 stages, 87 options
                    each family runs as an INSTANCE bound to specific people
  throughout        threads form, run, go dormant after 400 days
                    aftermaths schedule and resolve
                    quiet stretches of 31/47/78/124 days carry the years
                    the player model shifts from setup to lived evidence
```

The same nine episode families produce different stories in different lives
because they bind different people, fire in a different order, satisfy different
requirements, and branch on different choices.

## The honest limitation, stated plainly

**Two cold starts currently produce lives of very similar shape.** This is not a
composition failure — it is upstream, in how a starting life is generated
(`generateQuickCharacterHistory`). Two fresh characters get too-similar household,
work and organization records, so the same beats become eligible. This wave
**pinned it as a failing-when-fixed test** rather than tuning it away, and states
it in the completion report. It is real, it is known, and it belongs to the
Stage 6 writer, not to the narrative composition layer.

---

# CHAPTER 8 — HOW SAVES WORK

## Where a save lives

In the browser, in browser storage, managed by `BrowserSaveStore`
(`src/presentation/browser-world-repository.ts`, 1,549 lines). There is also a
SQLite repository (`src/persistence/sqlite-world-repository.ts`) for
non-browser use. **[MAIN-PLAYABLE]** / **[MAIN-SUBSTRATE]**

## What a save actually is

The whole world, serialized with `serializeWorld` through a **canonical JSON**
writer. Canonical means object keys are written in a fixed order, so two worlds
that are the same world produce byte-identical output regardless of the order
things happened to be inserted. That is what makes save comparison and replay
verification possible.

Because the world contains its own history, a save is complete. There is no
separate progress file to get out of step.

## What the save system does that most do not

```
  TOMBSTONES         a deleted save leaves a marker, so a stale tab cannot
                     resurrect it
  QUARANTINE         a save that fails validation is set aside, not silently
                     dropped, and the player is told
  SaveDefect         a real taxonomy of what can be wrong with a save
  CROSS-TAB          two tabs of the same game are detected and reconciled;
                     there is an e2e test for exactly this
  AUTOSAVE + FLUSH   pending writes are tracked, with an UnsavedSlot carrying
                     a reason: "pending" | "failed" | "conflict"
  UNSAVED GUARD      guardUnsavedWork() stops you losing a life by navigating
```

## What a player sees

A list of saves with name, age, place and date; a damaged-save presentation for
quarantined ones; a delete with confirmation; and an honest message when storage
is unavailable at all ("Games cannot be stored here, so a life played now will
not still be here later").

What a player does **not** see: any of the above sophistication. There is no
thumbnail, no visual differentiation, no indication of how far into a life a save
is beyond the age. See 60B, S-12.

## Replay

Because everything is deterministic, a seed plus a list of choices reproduces a
life exactly. There are e2e tests that do this in a real browser
(`player-seed-replay.spec.ts`, `developer-seed-replay.spec.ts`). The replay
descriptor carries **both halves** of the setup: the world seed and the setup
priors, kept separate on purpose so that changing a prior does not silently
change the world.

---

# CHAPTER 9 — HOW GRAPHICS ARE SUPPOSED TO WORK

This chapter is a summary; 60B is the full audit.

## The intended pipeline

```
  ART FILE
     -> intake (npm run intake:*)         validated, hashed, provenance recorded
     -> asset manifest entry              art/manifest/asset_manifest.json
     -> QA (npm run qa:art)               approved / pending
     -> release flag                      runtime_release_status
     -> registered in a SCENE             with measured geometry
     -> resolved by the SCENE REGISTRY    by scene id
     -> a raster TIER is chosen           by viewport and device pixel ratio
     -> the SCENE TRANSFORM places it     camera locked, aspect honoured
     -> PEOPLE are placed against it      floor line, seat plane, contact points
     -> OCCLUDERS draw in front           foreground masks with their own z-order
     -> SURFACE SLOTS carry dynamic text  names and signage composed at runtime
```

Every stage of this exists and works. **[MAIN-SUBSTRATE]**

## Where it actually stands

```
  assets in the manifest .......................... 111
  released ......................................... 51
  of those, PRODUCTION class ........................ 1
  the one production asset ..... env_shared_workroom_office_v1 (a room)
  production character masters, approved but UNRELEASED ... 25
  scenes registered .................................. 3
  scenes with production art ......................... 1
  scenes a player can reach .......................... 0
```

## What the player actually sees

Initials in a box. `PersonPortrait` deliberately refuses to hand a generated
stranger one of the two drawn likenesses, and draws nobody instead. That is the
right call and it is also the largest visual gap in the product.

## The 25 banked masters

A complete modular character kit — 2 body frames, 5 heads, 8 hair, 4 tops,
3 bottoms, 3 footwear — approved, unreleased, unused. Releasing and wiring them
is the cheapest large visual improvement available. See 60B, P0-05.

## PR #86

`claude/total-graphics-runtime-integration` is current with main and adds the
seam: a title tableau, three new production scenes, and a **13-consumer
disposition matrix** that _derives_ whether each player-facing surface is wired
to production art rather than asserting it. It is the correct next merge for the
visual product. **[OPEN-PR #86]**

---

# CHAPTER 10 — WHAT IS ACTUALLY DYNAMIC TODAY?

A direct answer to "how much of this is real?"

## Genuinely dynamic — different every life

```
  YES  the person: name, age, appearance seed, birth date
  YES  the household: who is in it, and whether there is anyone
  YES  kin, partnerships, care responsibilities
  YES  work: whether there is a job, and what kind
  YES  organizations: what the person belongs to
  YES  which beats are eligible, and in what order they arrive
  YES  which people are bound to which roles in a beat
  YES  which narrative threads form, and when they go dormant
  YES  which people recur, and how often
  YES  the calibration: which questions, how many, in what order
  YES  the player model: 14 dimensions, moving from setup to lived evidence
  YES  which aftermaths schedule, and whether they come back
  YES  the connective narration between beats
  YES  the journal, chaptered by four-year periods
  YES  the legislative rule pack, per jurisdiction (3 of 4 places)
```

## Authored, and the same every life

```
  FIXED  the prose of each beat (139 beats, 436 options)
  FIXED  the four bank contents
  FIXED  the 9 episode families and their 32 stages
  FIXED  the 5 conversation subjects and 15 intents
  FIXED  every NPC line in 4 of the 5 conversation subjects
  FIXED  the 4 available places
```

## Composed at runtime from records — the middle ground

This is the part that makes authored content feel dynamic. From the traced life:

```
  Authored scene copy:
    "Amir Ruiz says, not for the first time but for the first time out loud,
     that the week does not divide evenly..."

  Composed (place):
    "David Riley is 34, and lives in Kentucky."
       -- no history record; read from the person's own fields
  Composed (household):
    "Amir Ruiz was in the house every evening, and most of them were unremarkable."
       -- from household-membership_780a02c3c628815f
  Composed (civic):
    "The meetings kept happening, roughly monthly, mostly dull."
       -- from organization-participation_9d7c5365f143eae6
  Composed (elapsed):
    "A month later."
       -- date arithmetic only, no record
```

**Every composed sentence names its source.** "No history record — read from the
person's own fields" is a real answer the report gives, not a gap. That is what
"honest provenance" means in this project.

## The one-line answer

**The skeleton of a life is fully dynamic. The words on any single screen are
authored. What joins them — who is in the scene, why it is happening now, what
came before, what is still open — is composed from records and can always name
its source.**

---

# CHAPTER 11 — THE ENGINE'S UNUSED MUSCLE

This is the chapter to read if you want to know what you already own.

The measurement below is exact: for every record-writing function in the
simulation, which modules call it, excluding tests.

## Systems that write records nothing in the game reaches

### Vitality — health, capacity, and death **[MAIN-SUBSTRATE]**

`recordPersonDeath`, `recordPersonFunctionalCapacity`. Called only from
`vitality.ts` itself. 591 lines of vitality plus 1,013 lines of vitality
integrity checking. **Nobody in this game can die, get ill, or lose capacity in
play.** For a game about a fifty-year life, this is the most striking unused
system in the repository.

### Incidents — things that happen to people **[MAIN-SUBSTRATE]**

`recordActorInitiatedIncident`, `recordIncidentTransitionPlan`. 1,084 lines plus
a 363-line catalogue plus 731 lines of integrity checks. No production caller.

### World metrics and causal effects **[MAIN-SUBSTRATE]**

`recordWorldMetricObservation`, `recordWorldMetricState`,
`recordEvaluatedMetricState`, `recordCausalProcess`. 1,397 + 1,448 lines. The
machinery for "this policy changed this measurable thing" exists in full. Nothing
in play produces or consumes a metric.

### Evidence **[MAIN-SUBSTRATE]**

`recordEvidenceArtifact`, `recordEvidenceDiscovery`. The ability to find out a
fact through an artefact — a document, a record, a discovery — exists and is
unused.

### Mind — goals, values, personality **[MAIN-SUBSTRATE]**

`recordGoalState`, `recordPersonalValue`, `recordPersonalityTendency`. Reachable
only through the CLI demo (`npm run demo`), never through any player route. NPCs
have no goals in play.

### Politics — beliefs and public positions **[MAIN-SUBSTRATE]**

`recordPrivateBelief`, `recordPublicPosition`, `recordPrinciple`,
`recordPropositionExposure`, `recordSubjectKnowledge`, `recordCampaignCommitment`.
Same story: the demo reaches them, the game does not. **NPCs in the shipped game
hold no political beliefs.**

### Policy semantics **[MAIN-SUBSTRATE]**

`recordPolicyAlternative`, `recordPolicyBaseline`, `recordPolicyEstimate`,
`recordPolicyImplementationProfile`, `recordPolicyOperation`,
`recordPolicyProjectionRoot`, `recordPolicyAnalysisKnowledge`. 2,571 lines.
Reachable only from `WorkingDocumentWorkspace` on the developer route.

### Resource pressure, relationship moments, work compensation **[MAIN-SUBSTRATE]**

`recordResourcePressure`, `recordRelationshipMoment`,
`recordWorkCompensationTerms`. Declared, integrity-checked, uncalled.

### Election contests **[MAIN-SUBSTRATE]**

925 lines. Campaigns and a first election are the subject of **[OPEN-PR #85]**,
which this wave was explicitly carved out of.

## What IS reached in shipped play

For contrast, the recorders a normal playthrough actually exercises:

```
  recordWorldEvent                everything
  recordClaim                     the household conversation
  recordEventKnowledge            conversations and life writes
  recordPerception                the household conversation
  recordRelationshipInteraction   formative writes; 2 unreachable office intents
  recordDurableDecisionTrace      1 subject, 2 intents (dev route only)
  recordMemory                    formative and adult writes
  recordAppraisal                 some life writes
  recordTemporaryState            some life writes
  recordLifeCommitment            options carrying "take-on-commitment"
  recordKinship / household / education / work / care / organization states
                                  the life substrate, via character-history
  recordCommitteeDisposition, recordConcurrenceVote, recordEnactment,
  recordExecutiveAction, recordAdjournmentDeath
                                  the legislation workspace, when the character
                                  works for a legislature
```

## The scale of it

```
  record-writing functions in the simulation ........... 58
  reached by a normal playthrough ....................  ~22
  reached only by the CLI demo .......................   ~9
  reached only by developer routes ...................   ~8
  reached by nothing outside their own module ........  ~19
```

## What this means

You are not short of engine. You are short of **seams** — places where a screen
calls something that already works. The top five seams, by value:

```
  1. Vitality        -> a life that can end, or change capacity
  2. Mind            -> NPCs who want something
  3. Politics        -> NPCs who believe something
  4. Incidents       -> things that happen TO you
  5. Evidence        -> finding something out
```

Each of these is a screen and a call, not a system to build.

---

# CHAPTER 12 — WHAT WOULD BREAK IF WE DID THIS WRONG?

The failure modes this architecture is specifically defended against, why they
matter, and what defends them.

## 1. Inventing a causal link that is not there

**What it looks like:** the game says "because you helped Marcus last year, Dana
came to you" when nothing recorded a connection.
**Why it is fatal:** it is the one lie a player can catch and never trust again.
**Defence:** threads require a declared link basis. Adjacency is never a link.
Every episode requirement keeps the record ids that satisfied it.

## 2. Leaking mechanism into player copy

**What it looks like:** "This is a _pressing_ situation" or "your _civic-order_
score shifted."
**Why it is fatal:** it turns a life into a spreadsheet.
**Defence:** `life-opacity.test.ts` fails the build if any of `stakes`,
`pressing`, `notable`, `cross-pressure`, `dormant`, `thread key`, `instance key`,
`episode key`, `salience`, `confidence`, `prior`, `weight` or `dimension` reaches
a player surface — and separately forbids player modules from importing the
diagnostics module at all.

## 3. Silently skipping a scheduled consequence

**What it looks like:** you promised something, time passed, and nothing
happened — with no reason.
**Defence:** `advanceWorld` throws rather than stepping over a due item it has no
handler for. Six separate checks verify a handler did not mutate its input, move
the clock, change world identity, or rewrite history.

## 4. Non-determinism

**What it looks like:** the same seed gives two different lives; a bug cannot be
reproduced; the replay tests become meaningless.
**Defence:** a seeded RNG, canonical JSON key ordering, SHA-256 tie-breaks, and
in-browser seed-replay e2e tests.

## 5. Presentation writing to canonical state

**What it looks like:** a screen "fixes" a record to make itself look right, and
the world quietly diverges from its own history.
**Defence:** `assertWorldIntegrity` before and after every mutation; the
architecture-integrity test; the separation of projection functions (read) from
write functions.

## 6. Handing a generated stranger somebody else's face

**What it looks like:** every third NPC looks like the same two drawn people.
**Defence:** `PersonPortrait` checks the authored appearance seeds and draws
initials rather than borrowing a likeness.

## 7. Component state diverging from world state

**What it looks like:** you save mid-conversation, reload, and are back at turn
one of a conversation the world remembers you finishing.
**Defence:** `HouseholdConversation` derives both its progress and its turn
ordinal from `world.history`, never from React state. This was a real bug and
this is the fix.

## 8. British idiom in an American game

**What it looks like:** £, councils, councillors, catchment, lorries, bins.
**Why it matters:** it is the same class of error as the "central ministry" the
packet itself names, and it silently makes the game feel like it is about
somewhere else.
**Defence:** none automated. This wave's new copy had to be corrected by hand.
See 60C improvement #12.

## 9. A packet's boundary outliving its packet

**What it looks like:** a test that once enforced ownership starts failing every
future wave because it measures the working tree.
**Defence:** boundary tests are closed at a specific commit range
(`b986fbe..6311dd6`), not left open-ended. This wave's own boundary test caught a
scratch Playwright config that `git add -A` had swept in.

## 10. Tuning away an honest gap

**What it looks like:** the cold-start life-shape uniformity gets "fixed" by
adding randomness, and a real upstream defect is buried.
**Defence:** the gap is pinned as a test that fails when it is fixed, and stated
plainly in the completion report as an upstream `generateQuickCharacterHistory`
issue that this wave does not own.

---

# CHAPTER 13 — HOW I CAN TEST THIS GAME WITHOUT READING CODE

Everything here is a command you can run or a thing you can click.

## The one command that proves everything

```bash
npm run validate
```

This runs, in order: format check, lint, typecheck, **1,423 unit tests across 88
files**, a production build, a deterministic CLI demo against a fixed seed, and
art validation. If it is green, the engine is behaving.

```bash
npm run test:e2e
```

**134 browser tests across 17 spec files**, in real Chromium, at 13 viewport
sizes and 3 device pixel ratios. Takes about ten minutes.

## The single most useful thing you can run

```bash
npm run report:life -- <any-word-you-like>
```

This plays a whole life with that word as the seed and prints, in plain English:

1. **The calibration** — every question asked, why it was asked, what the runner-up
   was, and exactly which dimensions each answer moved and by how much.
2. **Every beat** — what was chosen from how many candidates, the selector's
   reason, whether the player model decided it, and whether it continues a thread.
3. **Why each beat was eligible** — every requirement, in words, with the record
   ids that satisfied it.
4. **Composition against canon** — for each sentence, whether it is authored copy
   or composed, and from which record.
5. **The life afterwards** — threads, recurring people, episode instances, what is
   still eligible, and the full player model.

Run it with two different words and compare. That is the fastest way to see
whether the game is producing different lives.

## Manual tests you can do by clicking

### Test 1 — Does the calibration adapt?

Start a new game. Answer everything the "safe/careful" way and count the
questions. Start again with the same place and age, answer everything the "bold"
way, count again. **The counts should differ.** If they are identical, the
information-gain stopping rule is broken.

### Test 2 — Does the game know a life has not started?

Start a brand-new life. **The very first screen must not tell you that years have
passed.** If it says something like "18 years later," the `choice.` tag counting
has regressed.

### Test 3 — Do quiet stretches feel different?

Press "Let time pass" four times in a row without doing anything else. **The four
gap sentences should not be identical.** They should reflect 31, 47, 78 and 124
days.

### Test 4 — Does the connective narration stay quiet when things are happening?

Make three choices in a row. **You should not get a "things went on as they were"
line** between them. Steady-state lines are only for genuinely quiet gaps of 25+
days.

### Test 5 — Are the right people in the right roles?

Play until an episode names somebody as a "familiar" or "somebody you know."
**It must not be your parent or housemate.** That was a real bug.

### Test 6 — Does a save survive a reload?

Play several beats, including a household conversation. Save. Reload the page.
Continue. **You must be exactly where you were, including mid-conversation.**

### Test 7 — Is the journal readable?

Open the Journal. **It should be chapters, people and open things — not a log.**
No entry should be two words long.

### Test 8 — Does the game leak its machinery?

Read every screen carefully. **You must never see the words** _stakes, pressing,
notable, cross-pressure, dormant, salience, confidence, weight,_ or _dimension._
There is an automated test for this, but read anyway.

### Test 9 — Does the same seed give the same life?

Start a new game, open Advanced, and note the seed. Play five beats writing down
each choice. Start again with the same seed and same setup, make the same
choices. **Everything should be identical.**

### Test 10 — Does it say what it does not know?

Look at the place list. **Four places, with a note explaining why there are only
four.** Look at a person. **Initials, not a borrowed face.** The game telling you
its limits is the feature.

## Where to look when something is wrong

```
  a beat fired at the wrong time    -> report:life, "What made it eligible"
  a person is in the wrong role     -> report:life, the role binding line
  the narration repeats             -> report:life, the Composed (elapsed) lines
  the calibration is too short/long -> report:life, "Stopped because"
  a save will not load              -> the saves screen names the defect
  a scene is missing art            -> npm run inventory:art
```

---

# PART TWO — THE DIAGRAMS

---

## DIAGRAM A — THE SHAPE OF THE WHOLE THING

```
  ==========================================================================
                              WHAT THE PLAYER TOUCHES
  ==========================================================================
     /                    -> PlayerGame          [MAIN-PLAYABLE]
     /?view=office-fixture-> PlayerOffice        [MAIN-SUBSTRATE]
     /?view=developer     -> DeveloperViewer     [MAIN-SUBSTRATE]
     /?view=*-proof       -> art review views    [MAIN-SUBSTRATE]
                                |
  ==========================================================================
                              PRESENTATION (reads only)
  ==========================================================================
     life-story       what beat is next          life-record    the journal
     life-narration   the connective prose       ordinary-life  a plain day
     formative-play   the growing-up years       adult-life     adulthood
     run-b-conversation  the turn engine         legislation-*  the workspace
     new-game / production-world   building a life from a setup
                                |
                     (projection functions read; write
                      functions call the simulation)
                                |
  ==========================================================================
                              SIMULATION (the only writer)
  ==========================================================================
     world              the clock, integrity, advanceWorld
     history            the append-only store
     life               households, kin, work, care, education, orgs
     resources          money, housing, obligations
     character-history  the formative bank and its writes
     adult-situations   the adult bank and its writes
     episode-bank       the 9 multi-stage families        [OPEN-PR #87]
     life-episodes      requirements, roles, instances    [OPEN-PR #87]
     narrative-threads  the thread index                  [OPEN-PR #87]
     situation-selection  one ranking across three sources
     player-model       Pennywise, 14 dimensions
     setup-questionnaire  the calibration
     legislation        bills, committees, votes, enactment
     ... plus vitality, incidents, mind, politics, evidence, world-metrics,
         causal-effects, policy-semantics, election-contests
         (all working, none reached in play — Chapter 11)
                                |
  ==========================================================================
                              PERSISTENCE
  ==========================================================================
     browser-world-repository   BrowserSaveStore, tombstones, quarantine
     sqlite-world-repository    the non-browser path
     canonical-json             stable key ordering, so bytes compare
  ==========================================================================
```

---

## DIAGRAM B — WHAT HAPPENS ON ADVANCE TIME

```
   [ Let time pass ]
          |
          v
   quietStepDays(from)  ->  31 | 47 | 78 | 124        (rotates deterministically)
          |
          v
   advanceWorld(world, days, LIFE_TRANSITION_HANDLERS)
          |
          +-- validate days is a positive integer
          +-- assertWorldIntegrity(world)              BEFORE
          +-- compute nextDate and nextMoment
          |
          v
   resolveFutureDueItemsThrough(world, nextDate, registry)
          |
          +-- PRE-CHECK: every due item has a handler, or THROW
          |
          +--> LOOP, earliest due item first:
          |      set clock to THAT item's due date
          |      handler(worldAtDueDate, item)
          |        |
          |        +-- did it mutate its input?        -> THROW
          |        +-- did it change world identity?   -> THROW
          |        +-- did it change the date?         -> THROW
          |        +-- did it change actionSequence?   -> THROW
          |        +-- did it rewrite due-item history?-> THROW
          |        +-- did it schedule anything not new
          |            and "scheduled"?                -> THROW
          |        +-- assertWorldIntegrity(result)
          |      write terminal state { status, reasonKey, context,
          |                             outcomeEventId }
          |      (a handler may schedule more; if due in window, loop again)
          |
          v
   actionSequence += 1
   recordWorldEvent  type: simulation.time-advanced   tag: simulation.time
          |
          v
   projectStoryMoment(world, personId)   ->  the next beat on screen
```

---

## DIAGRAM C — HOW ONE BEAT IS CHOSEN

```
   THREE SOURCES, ONE RANKING
   ==========================

   formative bank        adult bank            episode bank
   19 situations         35 situations         9 families / 32 stages
   49 options            102 options           87 options
        |                     |                      |
        +----------+----------+----------+-----------+
                              |
                              v
              1. HARD ELIGIBILITY
                 age band, required facts, required roles
                 (an episode stage checks all 10 requirement kinds)
                              |
                              v
              2. CAUSAL AVAILABILITY
                 is this due because something happened?
                 if yes -> the player model STANDS DOWN
                              |
                              v
              3. RELEVANCE
                 does this engage what this player engages with?
                              |
                              v
              4. CROSS-PRESSURE
                 does this push against them rather than confirm them?
                              |
                              v
              5. NOVELTY GUARD          seen too recently?
                              |
                              v
              6. PACING GUARD           is the rhythm right?
                              |
                              v
              7. SHA-256 TIE-BREAK      deterministic, always
                              |
                              v
                    ONE BEAT, plus a trace:
                      "from N candidates (X composed, Y authored)"
                      "Selector's reason: cross-pressure"
                      "The player model decided the ranking."
                        OR
                      "The beat was causally due; the player model did not
                       decide it."
```

---

## DIAGRAM D — WHAT ONE CONVERSATION TURN WRITES

```
   PLAYER: intent + addressee + audibility
        |
        +-- is the intent one the SUBJECT is offering right now?  else THROW
        +-- has this turn ordinal already been used?              else THROW
        |
        v
   LISTENERS
        normal   -> everyone in the room
        quiet    -> addressee + anyone close enough
        private  -> addressee only (and THROW if the room has no privacy)
        |
        v
   RESPONDER (one of six)
        office path (2 intents)  -> evaluateConversationDecision
                                    recordDurableDecisionTrace
                                    durableDecisionRecorded = TRUE
        the other four           -> switch (intent) -> one fixed line
                                    durableDecisionRecorded = FALSE
        |
        v
   WRITES, in this order:
        1. EVENT        participants with roles:
                          agency:initiator / presence:participant /
                          focus:respondent / focus:addressee /
                          observation:listener
                        visibility: private when audibility is private
                        tags: subject, intent, audibility
        2. CLAIM        only if the NPC actually said something
                        audience: private | limited
                        relationshipToTruth: "unknown"        (always)
        3. KNOWLEDGE    presence, one per participant
                        accuracy "accurate", source "direct"
        4. KNOWLEDGE    claim, one per listener != speaker
                        accuracy "unknown", source told-by + claimId
        5. PERCEPTION   one per listener != speaker
                        source heard-claim + claimId + knowledgeId
                        supersedesPerceptionId: null           (always)
        6. RELATIONSHIP only for reassure (strengthened) and press (strained)
                        -- i.e. NEVER in shipped play
        |
        v
   assertWorldIntegrity(world)
```

---

## DIAGRAM E — HOW A NARRATIVE THREAD IS FORMED

```
   THE RULE:  two records being near each other in time is NOT a link.

   A thread exists ONLY on a declared basis:

        shared-person          the same person is in both records
        shared-organization    the same organization
        shared-record          the same underlying record
        shared-stable-key      the same stable key

   ---------------------------------------------------------------------
   NOT A THREAD                          A THREAD
   ---------------------------------------------------------------------
   event on 3 March                      event names Amir Ruiz
   event on 5 March                      event names Amir Ruiz
   -> nothing joins them                 -> shared-person: Amir Ruiz
                                            household-membership_780a02c...
   ---------------------------------------------------------------------

   A thread has a FAMILY and a STANDING:

        families seen in a real life:
            promise | kin | household | civic | companionship

        standing:
            opening   just begun
            running   active
            pressing  something is due
            dormant   400+ days with nothing new  (NEVER deleted)
            settled   closed

   From the traced audit-seed life:
        promise:Joel Riley                 [opening]
        kin:Joel Riley                     [running]
        promise:Something decided earlier  [opening]
        household:Amir Ruiz                [running]
        civic:Community Service Club       [opening]
        companionship:Dylan Butler         [dormant]
        companionship:Elijah Vargas        [dormant]

   RECURRING PEOPLE = how many threads a person appears in:
        Joel Riley (4)  Amir Ruiz (2)  Dylan Butler (2)  Elijah Vargas (2)
```

---

## DIAGRAM F — HOW PENNYWISE LEARNS

```
   14 DIMENSIONS
   =============
   8 CIVIC                          6 LIFE
     econ-distribution                decision-style
     social-pluralism                 personal-ties
     institutional-trust              achievement-ambition
     civic-order                      security-stability
     governance-scale                 risk-appetite
     security-posture                 care-obligation
     ecological-priority              privacy-preference
     (+1)

   EVIDENCE STRENGTH
   =================
     SETUP    0.25   you said this before the game started
     STATED   0.6    you said this in the game
     ENACTED  1.2    you DID this, in a world that could answer back

   THE CALIBRATION
   ===============
     3 fixed openers          kitchen_late
                              marcus_and_the_trip_fund
                              priya_reference
              |
              v
     then, each next question by MARGINAL INFORMATION VALUE
       + a REGISTER GATE so it does not ask 5 policy questions in a row
         (6 registers: lived-personal, lived-relational, lived-moral,
                       civic-lived, policy-lived, policy-docket)
       + a SHA-256 tie-break so the same player gets the same questionnaire
              |
              v
     STOPS when the best remaining question is worth < 0.9
       measured: 19, 22 and 37 questions for three answer patterns
       audit-seed: stopped at 19, reason "information-gain-floor",
                   best remaining worth 0.87

   IN PLAY
   =======
     every choice's `nudges` apply at ENACTED strength
              |
              v
     the model shifts from setup evidence to lived evidence:
        personal-ties      fromSetup 7   fromGameplay 3
        care-obligation    fromSetup 4   fromGameplay 3
        civic-order        fromSetup 6   fromGameplay 0
              |
              v
     used ONLY to rank which eligible beat to offer,
     and NEVER shown to the player (enforced by life-opacity.test.ts)
```

---

## DIAGRAM G — HOW A SAVE IS WRITTEN AND READ

```
   WRITING
   =======
   world (containing its own complete history)
        |
        v
   serializeWorld
        |
        v
   canonical JSON        keys in a FIXED order, so two identical worlds
                         produce byte-identical output
        |
        v
   createBrowserWorldRecord
        |
        v
   BrowserSaveStore  ->  browser storage
        |                    +-- tombstone on delete (a stale tab cannot
        |                        resurrect a deleted save)
        |                    +-- UnsavedSlot { reason: pending|failed|conflict }
        |                    +-- autosave + flush
        v
   guardUnsavedWork()    stops navigation losing a life

   READING
   =======
   browser storage
        |
        v
   readStoredRecord  ->  validateBrowserWorldRecord
        |                     |
        |                     +-- fails? -> QUARANTINE, with a SaveDefect
        |                                   the player is TOLD, not silently
        |                                   dropped
        v
   deserializeWorld  ->  assertWorldIntegrity  ->  play

   REPLAY
   ======
   seed + choices  ->  identical life, every time
     the replay descriptor carries BOTH halves separately:
        the world seed   (what the world is)
        the setup priors (what the player said before starting)
     so changing a prior cannot silently change the world
```

---

## DIAGRAM H — HOW A FIFTY-YEAR LIFE IS COMPOSED WITHOUT A SCRIPT

```
   AGE 5 ..................... 18 ......................... 70+
   |                            |                             |
   | FORMATIVE                  | ADULT                       |
   | 19 situations              | 35 situations               |
   | 49 options                 | 102 options                 |
   | formativeStepDays()        | quiet steps 31/47/78/124    |
   |                            |                             |
   +----------------------------+-----------------------------+
   |                                                          |
   |   EPISODE FAMILIES run as INSTANCES bound to real people |
   |   growing-up.a-friend-over-years spans YEARS             |
   |   home.the-week-that-does-not-balance[companion=<person>]|
   |                                                          |
   +----------------------------------------------------------+
                              |
        AT EVERY POINT, THE SAME FOUR THINGS ARE HAPPENING:
                              |
     1. FACTS CHANGE       household, work, orgs, care, money
                              |
     2. BEATS BECOME        because requirements are satisfied,
        ELIGIBLE            not because anything was scheduled
                              |
     3. THREADS FORM        on a declared basis, never on adjacency
        RUN, GO DORMANT     dormant after 400 days, never deleted
                              |
     4. AFTERMATHS          obligation  96d   grievance  187d
        SCHEDULE            goodwill   251d   standing   314d
        AND RETURN          -> came back, or one of 5 honest reasons why not
                              |
                              v
        AND BETWEEN THEM, CONNECTIVE NARRATION:
           elapsed time    "A month later."
           open threads    what is still unresolved
           recurring people who has been around
           steady state    ONLY when nothing moved AND the gap is 25+ days

   NINE FAMILIES PRODUCE DIFFERENT STORIES IN DIFFERENT LIVES BECAUSE:
      different people are bound to the roles
      different requirements are satisfied, so different stages open
      the branch depends on the exact option chosen, months earlier
      the order is chosen by relevance and cross-pressure, then SHA-256
```

---

# PART THREE — THE SYSTEMS CATALOGUE

Forty-four named systems. Each is described with the same eleven points, in the
same order, so you can compare any two of them:

```
   1. WHAT IT IS                 one sentence
   2. WHERE IT LIVES             the files
   3. STATUS                     one of the five labels
   4. WHAT IT DOES FOR A PLAYER  the point of it
   5. WHAT IT READS              its inputs
   6. WHAT IT WRITES             its outputs
   7. WHAT DECIDES ITS BEHAVIOUR the rule that governs it
   8. WORKED EXAMPLE             a concrete instance
   9. WHAT IT CANNOT DO          the honest limit
  10. WHAT BREAKS IF IT IS WRONG the consequence
  11. HOW TO CHECK IT YOURSELF   a command or a click
```

---

## GROUP ONE — TIME, TRUTH AND THE WORLD

### SYSTEM 1 — THE WORLD

1. **What it is.** The single object that is the game: a clock, a set of people, a
   control record saying who the player is, an action sequence, and a complete
   history.
2. **Where it lives.** `src/simulation/world.ts` (3,091 lines),
   `src/simulation/types.ts` (3,422 lines, 422 exports).
3. **Status.** **[MAIN-PLAYABLE]**
4. **What it does for a player.** It is everything the game knows. A save is this
   object; a life is this object over time.
5. **What it reads.** Nothing — it is the root.
6. **What it writes.** Nothing directly; every writer returns a _new_ world.
7. **What decides its behaviour.** Immutability. No function mutates a world; each
   returns a successor, which is what makes the integrity checks meaningful.
8. **Worked example.** `advanceWorld(world, 78, handlers)` returns a new world
   with a later date, the same id, and one more event.
9. **What it cannot do.** Be edited in place. There is no "set this field."
10. **What breaks if it is wrong.** Everything. Two screens could disagree about
    what happened.
11. **How to check it.** `npm run validate` — the integrity assertions run
    constantly inside the test suite.

### SYSTEM 2 — TIME AND DATES

1. **What it is.** ISO dates, simulation moments (date + minute-of-day + time zone
   - UTC offset), and the arithmetic between them.
2. **Where it lives.** `src/simulation/dates.ts` (417 lines, 19 exports).
3. **Status.** **[MAIN-PLAYABLE]**
4. **What it does for a player.** Makes "a month later" mean a real month.
5. **What it reads.** Dates and offsets.
6. **What it writes.** Nothing; it is pure arithmetic.
7. **What decides its behaviour.** Dates are values, never `Date` objects with
   local time zones attached. `makeIsoDate` and `addDays` are the only path.
8. **Worked example.** `addDays(makeIsoDate("2026-01-05"), 96)` gives the due date
   for an obligation aftermath.
9. **What it cannot do.** Represent an unknown or approximate date.
10. **What breaks if it is wrong.** Aftermaths land in the wrong month; ages drift;
    replay diverges by time zone.
11. **How to check it.** `src/simulation/dates.test.ts`.

### SYSTEM 3 — ADVANCE TIME

1. **What it is.** The only way the clock moves.
2. **Where it lives.** `advanceWorld` in `src/simulation/world.ts:814`.
3. **Status.** **[MAIN-PLAYABLE]**
4. **What it does for a player.** Turns "Let time pass" into a real passage of
   time with real consequences.
5. **What it reads.** The world, a day count, and a handler registry.
6. **What it writes.** One `simulation.time-advanced` event, plus whatever the
   resolved due items wrote.
7. **What decides its behaviour.** It refuses to skip a due item it cannot handle.
8. **Worked example.** See Chapter 1 and Diagram B.
9. **What it cannot do.** Move backwards, or by a fraction of a day.
10. **What breaks if it is wrong.** A promise the world made silently vanishes.
11. **How to check it.** Press "Let time pass" four times; the gaps should differ.

### SYSTEM 4 — FUTURE DUE ITEMS AND TRANSITIONS

1. **What it is.** The scheduling system: something dated, with a handler key, and
   a terminal state when it resolves.
2. **Where it lives.** `src/simulation/future-transitions.ts` (852 lines).
3. **Status.** **[MAIN-PLAYABLE]**
4. **What it does for a player.** Lets a choice today matter in nine months.
5. **What it reads.** `world.history.futureDueItems` and their states.
6. **What it writes.** New due items, and terminal states with reasons.
7. **What decides its behaviour.** Six invariants checked on every handler: no
   mutation of input, no change to world identity, date or action sequence, no
   rewriting due-item history, only new items may be scheduled, and integrity must
   hold afterwards.
8. **Worked example.** An obligation scheduled 96 days out, resolved on the exact
   due date during a 124-day jump.
9. **What it cannot do.** Cancel silently; a cancellation is a recorded state.
10. **What breaks if it is wrong.** Consequences fire on the wrong date or not at
    all.
11. **How to check it.** `npm run report:life -- <seed>` shows callbacks resolving.

### SYSTEM 5 — THE HISTORY STORE

1. **What it is.** The append-only record of everything.
2. **Where it lives.** `src/simulation/history.ts` (994 lines, 39 exports).
3. **Status.** **[MAIN-PLAYABLE]**
4. **What it does for a player.** It is their life. The journal, the threads, the
   recurring people and the save are all readings of it.
5. **What it reads.** Nothing.
6. **What it writes.** Events, claims, knowledge, perceptions, memories,
   relationship interactions and moments, due items and their states, work items,
   decisions and traces, appraisals, temporary states, commitments, and the whole
   life substrate.
7. **What decides its behaviour.** Append-only, with `stableKey` deduplication.
8. **Worked example.** Writing the same event stableKey twice is the same event,
   which is what makes replay idempotent.
9. **What it cannot do.** Forget. Nothing is ever deleted.
10. **What breaks if it is wrong.** Saves diverge; replay fails; the journal lies.
11. **How to check it.** Save, reload, continue — you must be exactly where you were.

### SYSTEM 6 — SEEDED RANDOMNESS AND DETERMINISM

1. **What it is.** A seeded RNG plus a SHA-256 implementation used for tie-breaks.
2. **Where it lives.** `src/simulation/rng.ts` (118 lines),
   `src/simulation/sha256.ts` (189 lines).
3. **Status.** **[MAIN-PLAYABLE]**
4. **What it does for a player.** Guarantees the same seed gives the same life.
5. **What it reads.** A seed string.
6. **What it writes.** Nothing.
7. **What decides its behaviour.** The settled questionnaire semantics name
   SHA-256 explicitly, so it is written out rather than borrowed.
8. **Worked example.** Two eligible beats of equal score are ordered by a SHA-256
   over world seed, person, bank and version.
9. **What it cannot do.** Produce anything a second run would not reproduce.
10. **What breaks if it is wrong.** Bugs become unreproducible; the replay e2e
    tests become meaningless.
11. **How to check it.** Manual test 9 in Chapter 13.

### SYSTEM 7 — CANONICAL JSON AND SERIALIZATION

1. **What it is.** A JSON writer that emits object keys in a fixed order.
2. **Where it lives.** `src/simulation/canonical-json.ts`,
   `src/simulation/serialization.ts`, `src/authoring/canonical-json.ts`.
3. **Status.** **[MAIN-PLAYABLE]**
4. **What it does for a player.** Makes saves comparable and replay verifiable.
5. **What it reads.** A world.
6. **What it writes.** A string.
7. **What decides its behaviour.** Its own documentation: _"two worlds that are
   the same world in every semantic respect"_ must produce the same bytes.
8. **Worked example.** The future-transition checks compare `JSON.stringify` of a
   world before and after a handler to prove no mutation.
9. **What it cannot do.** Compress, or omit.
10. **What breaks if it is wrong.** False "the world changed" errors, or missed
    real ones.
11. **How to check it.** `src/simulation/canonical-json.test.ts`.

### SYSTEM 8 — WORLD INTEGRITY ASSERTIONS

1. **What it is.** A family of checkers that refuse to let a broken world exist.
2. **Where it lives.** `life-integrity.ts` (1,486), `mind-integrity.ts` (1,467),
   `vitality-integrity.ts` (1,013), `resource-integrity.ts` (979),
   `incident-integrity.ts` (731), `evidence-integrity.ts` (508),
   `legislation-integrity.ts` (507).
3. **Status.** **[MAIN-PLAYABLE]**
4. **What it does for a player.** Turns a subtle data corruption into a loud,
   immediate error instead of a wrong sentence three hours later.
5. **What it reads.** The whole world.
6. **What it writes.** Nothing; it throws.
7. **What decides its behaviour.** Every mutating function asserts before and
   after.
8. **Worked example.** A conversation turn asserts integrity before it starts and
   after it finishes writing six records.
9. **What it cannot do.** Repair anything.
10. **What breaks if it is wrong.** Corruption reaches a save.
11. **How to check it.** It runs inside every one of the 1,423 unit tests.

---

## GROUP TWO — PEOPLE AND PLACE

### SYSTEM 9 — PEOPLE AND PERSON GENERATION

1. **What it is.** The creation and identity of every person.
2. **Where it lives.** `src/simulation/people.ts` (649), `person-appearance.ts`,
   `person-stress-harness.ts`.
3. **Status.** **[MAIN-PLAYABLE]**
4. **What it does for a player.** Gives the world other people who are real
   records, not decorations.
5. **What it reads.** A seeded RNG, the name corpora.
6. **What it writes.** Person records with given name, family name, birth date,
   home jurisdiction, appearance seed.
7. **What decides its behaviour.** Determinism from the world seed.
8. **Worked example.** Seed `audit-seed` produces David Riley, 34, Kentucky, with
   a housemate called Amir Ruiz.
9. **What it cannot do.** Age, sicken, or die in play (see System 21).
10. **What breaks if it is wrong.** Two runs of the same seed give different
    people, and replay fails.
11. **How to check it.** `npm run stress:persons`.

### SYSTEM 10 — NAMES DATA

1. **What it is.** Versioned, deterministic name corpora with recorded provenance.
2. **Where it lives.** `src/simulation/names-data.ts` (1,155 lines).
3. **Status.** **[MAIN-PLAYABLE]**
4. **What it does for a player.** Names that are plausible and consistent.
5. **What it reads.** Its own corpora.
6. **What it writes.** Nothing.
7. **What decides its behaviour.** The module's own header records the corpus
   version (`names-v1`) and its licensing position.
8. **Worked example.** "Priya", "Marcus", "Ms. Whitfield" in the calibration bank
   are authored fixtures; "Amir Ruiz" is generated.
9. **What it cannot do.** Reflect real regional distributions per jurisdiction.
10. **What breaks if it is wrong.** The world feels generic, or worse, wrong about
    a place.
11. **How to check it.** Start several games and read the names.

### SYSTEM 11 — PERSON APPEARANCE

1. **What it is.** A deterministic appearance seed per person.
2. **Where it lives.** `src/simulation/person-appearance.ts` (85 lines).
3. **Status.** **[MAIN-PLAYABLE]** (the seed) / **[MISSING]** (any art for it)
4. **What it does for a player.** Would let the same person look the same every
   time they appear.
5. **What it reads.** The person and the world seed.
6. **What it writes.** An appearance seed on the person.
7. **What decides its behaviour.** Determinism.
8. **Worked example.** `PersonPortrait` checks whether a person's seed is one of
   the two authored ones, and sets `data-likeness="authored"` or `"none"`.
9. **What it cannot do.** Produce a picture. Nothing renders it.
10. **What breaks if it is wrong.** A person's face would change between scenes.
11. **How to check it.** `src/simulation/appearance-persistence.test.ts`.

### SYSTEM 12 — LIFE PLACES AND JURISDICTIONS

1. **What it is.** The four places a life can happen in, and their capabilities.
2. **Where it lives.** `src/simulation/life-places.ts` (183 lines).
3. **Status.** **[MAIN-PLAYABLE]**
4. **What it does for a player.** Decides where they live and which legislature,
   if any, their work runs under.
5. **What it reads.** Its own table.
6. **What it writes.** Nothing.
7. **What decides its behaviour.** `lifePlaceCoverage()` states honestly that
   arbitrary place selection is unsupported and why.
8. **Worked example.**
   ```
     Kentucky              legislature: kentucky
     Nebraska              legislature: nebraska
     Alaska                legislature: alaska
     Lexington, Kentucky   (formal: Lexington-Fayette, Kentucky)   none
   ```
9. **What it cannot do.** Offer any other place. A national place corpus is the
   named outstanding dependency.
10. **What breaks if it is wrong.** A character gets another state's legislative
    procedure with the name swapped.
11. **How to check it.** The setup screen; the note under the list explains itself.

---

## GROUP THREE — THE LIFE SUBSTRATE

### SYSTEM 13 — HOUSEHOLDS AND KINSHIP

1. **What it is.** Who lives with whom, and who is related to whom.
2. **Where it lives.** `src/simulation/life.ts` (1,995 lines, 46 exports).
3. **Status.** **[MAIN-PLAYABLE]**
4. **What it does for a player.** Gives the home beats somebody to be about.
5. **What it reads.** The world.
6. **What it writes.** `createHousehold`, `startHouseholdMembership`,
   `recordHouseholdMembershipState`, `recordHouseholdLocation`, `recordKinship`.
7. **What decides its behaviour.** Membership is a period with states, not a flag.
8. **Worked example.** `household-membership_780a02c3c628815f` is the single record
   that satisfied both the `role` and the `fact household.shared` requirements for
   the first beat of the traced life.
9. **What it cannot do.** Model moving house as an event a player experiences.
10. **What breaks if it is wrong.** Beats bind the wrong person, or none.
11. **How to check it.** `report:life`, the "What made it eligible" section.

### SYSTEM 14 — PARTNERSHIPS AND CARE RESPONSIBILITIES

1. **What it is.** Romantic partnerships and caring relationships as records.
2. **Where it lives.** `src/simulation/life.ts`.
3. **Status.** **[MAIN-PLAYABLE]** (records) — `recordPartnershipState` has no
   caller outside `life.ts`, so partnership _change_ is **[MAIN-SUBSTRATE]**.
4. **What it does for a player.** Enables `adult.partner-plan`,
   `adult.care-request`, and the whole `care.the-person-you-look-after` family.
5. **What it reads.** The world.
6. **What it writes.** `createPartnership`, `recordPartnershipState`,
   `createCareResponsibility`, `recordCareResponsibilityState`.
7. **What decides its behaviour.** A care responsibility names who is cared for.
8. **Worked example.** The `care.the-person-you-look-after` family requires a care
   responsibility to exist before its first stage can be offered.
9. **What it cannot do.** Begin or end a partnership through play.
10. **What breaks if it is wrong.** A care episode about nobody.
11. **How to check it.** `src/simulation/life-foundation.test.ts`.

### SYSTEM 15 — WORK RELATIONSHIPS

1. **What it is.** Employment as a record with a kind, a status and a role.
2. **Where it lives.** `src/simulation/life.ts`, `src/simulation/time-work.ts`
   (1,908 lines).
3. **Status.** **[MAIN-PLAYABLE]**
4. **What it does for a player.** Decides whether they have a job, and whether the
   legislative workspace appears at all.
5. **What it reads.** The world and the current date.
6. **What it writes.** `createWorkRelationship`, `recordWorkStatus`,
   `recordWorkRole`, `recordWorkCompensationTerms`.
7. **What decides its behaviour.** The workplace jurisdiction, not the home
   address, decides which legislature applies — because people commute.
8. **Worked example.** Choosing "legislative office" at setup creates a work
   relationship of kind `employment:legislative-staff`, which
   `resolvePlayerCapabilities` detects via the prefix `employment:legislative-`.
9. **What it cannot do.** Model an ordinary job as a place you go. There is no
   room for a warehouse.
10. **What breaks if it is wrong.** Somebody gets the wrong chamber's rules.
11. **How to check it.** Start a life with "legislative office" and confirm the
    workspace appears; start one with "ordinary life" and confirm it does not.

### SYSTEM 16 — EDUCATION ENROLLMENT

1. **What it is.** Being at school or in training, as a period with states.
2. **Where it lives.** `src/simulation/life.ts`.
3. **Status.** **[MAIN-PLAYABLE]**
4. **What it does for a player.** Gates the school formative situations.
5. **What it reads.** The world.
6. **What it writes.** `createEducationEnrollment`,
   `recordEducationEnrollmentState`.
7. **What decides its behaviour.** Age band plus an active enrollment.
8. **Worked example.** `school.the-thing-you-got-blamed-for` and
   `formative.school-entry`, `formative.lunch-table`, `formative.school-rule-input`.
9. **What it cannot do.** Model results, subjects, or progression.
10. **What breaks if it is wrong.** School scenes for somebody who is not at school.
11. **How to check it.** Start a life at age 8 and confirm school beats appear.

### SYSTEM 17 — ORGANIZATIONS AND PARTICIPATION

1. **What it is.** Groups a person belongs to, and how.
2. **Where it lives.** `src/simulation/life.ts`.
3. **Status.** **[MAIN-PLAYABLE]**
4. **What it does for a player.** Enables the whole civic strand.
5. **What it reads.** The world.
6. **What it writes.** `createOrganization`, `materializeOrganization`,
   `recordOrganizationProfile`, `createOrganizationParticipation`,
   `recordOrganizationParticipationState`.
7. **What decides its behaviour.** Participation is typed:
   `membership:` / `activity:` / `leadership:` and `member:` / `participant:` /
   `leader:`.
8. **Worked example.** From the traced life: _"The meetings kept happening,
   roughly monthly, mostly dull."_ — composed from
   `organization-participation_9d7c5365f143eae6`.
9. **What it cannot do.** Model an organization's own internal life.
10. **What breaks if it is wrong.** Civic episodes with no group behind them.
11. **How to check it.** `report:life`, the "civic" composed line.

### SYSTEM 18 — RESOURCES, HOUSING AND MONEY

1. **What it is.** Dwellings, tenure, resource positions, flows, obligations and
   transfer outcomes.
2. **Where it lives.** `src/simulation/resources.ts` (1,342),
   `resource-queries.ts` (485), `resource-pressure.ts` (164), `economy.ts` (346),
   `quantity.ts` (267).
3. **Status.** **[MAIN-PLAYABLE]** for the records written by life choices;
   **[MAIN-SUBSTRATE]** for `recordResourcePressure` and
   `recordWorkCompensationTerms`.
4. **What it does for a player.** Makes `money.the-thing-you-are-behind-on`,
   `adult.debt-call`, `adult.housing-cost-change` and
   `adult.unexpected-expense` about something real.
5. **What it reads.** The world.
6. **What it writes.** `createDwelling`, `createHousingTenure`,
   `recordHousingTenureState`, `recordDwellingOccupancyState`,
   `createResourcePosition`, `createResourceFlow`, `recordResourceFlowTerms`,
   `createResourceObligation`, `recordResourceObligationState`,
   `recordResourceTransferOutcome`.
7. **What decides its behaviour.** Quantities are typed values, not bare numbers.
8. **Worked example.** `money.the-thing-you-are-behind-on / the-first-letter`
   offers `call | pay-part | wait`, and `arrangement-held` follows only if an
   obligation state says the arrangement held.
9. **What it cannot do.** Present a budget, a balance, or a bank account to the
   player. There is no money UI.
10. **What breaks if it is wrong.** Money beats that contradict each other.
11. **How to check it.** Play until a money beat and follow it through two stages.

### SYSTEM 19 — VITALITY (HEALTH, CAPACITY, DEATH)

1. **What it is.** Health states, functional capacity, and death.
2. **Where it lives.** `src/simulation/vitality.ts` (591),
   `vitality-catalog.ts` (216), `vitality-integrity.ts` (1,013).
3. **Status.** **[MAIN-SUBSTRATE]** — `recordPersonDeath` and
   `recordPersonFunctionalCapacity` have no caller outside `vitality.ts`.
4. **What it does for a player.** Nothing yet.
5. **What it reads.** The world.
6. **What it writes.** Death and capacity records.
7. **What decides its behaviour.** A catalogue of vitality states.
8. **Worked example.** None exists in play.
9. **What it cannot do.** Be reached. **Nobody in this game can die.**
10. **What breaks if it is wrong.** Nothing today — which is the problem.
11. **How to check it.** `src/simulation/*vitality*` tests.

### SYSTEM 20 — MIND (GOALS, VALUES, PERSONALITY, APPRAISALS)

1. **What it is.** What an NPC wants, values, is like, and how they rate things.
2. **Where it lives.** `src/simulation/mind.ts` (1,284), `mind-catalog.ts` (403),
   `mind-integrity.ts` (1,467).
3. **Status.** **[MAIN-SUBSTRATE]** — `recordGoalState`, `recordPersonalValue`
   and `recordPersonalityTendency` are reached only by the CLI demo.
   `recordAppraisal` and `recordTemporaryState` _are_ reached in play.
4. **What it does for a player.** Appraisals and temporary states are written by
   life choices; goals and values are not.
5. **What it reads.** The world.
6. **What it writes.** Goals, values, tendencies, appraisals, temporary states.
7. **What decides its behaviour.** Every mind record carries a provenance.
8. **Worked example.** `createMindProvenance` is called from
   `character-history.ts` when a formative choice writes an appraisal.
9. **What it cannot do.** Give an NPC a goal a player can encounter.
10. **What breaks if it is wrong.** NPCs would want contradictory things.
11. **How to check it.** `?view=developer` shows a MindProfile.

### SYSTEM 21 — PERCEPTION

1. **What it is.** One person's opinion about another person or thing, with a
   traceable source.
2. **Where it lives.** `src/simulation/perception.ts` (282 lines).
3. **Status.** **[MAIN-PLAYABLE]**
4. **What it does for a player.** Records what the household NPC thinks after a
   conversation turn.
5. **What it reads.** A claim and a knowledge record.
6. **What it writes.** A perception with subject, assertion, confidence, source
   credibility, and a source naming the claim and knowledge ids.
7. **What decides its behaviour.** Every perception must name its source.
8. **Worked example.** _"Ruiz accepted the offer and said it counted."_, confidence
   medium, source `{ heard-claim, claimId, knowledgeId }`.
9. **What it cannot do.** Supersede an earlier perception —
   `supersedesPerceptionId` is always null. See 60C, D-07.
10. **What breaks if it is wrong.** Opinions with no traceable cause.
11. **How to check it.** `?view=developer` → PersonInspector.

### SYSTEM 22 — EVIDENCE

1. **What it is.** Artefacts that carry facts, and the discovery of them.
2. **Where it lives.** `src/simulation/evidence.ts` (340),
   `evidence-integrity.ts` (508).
3. **Status.** **[MAIN-SUBSTRATE]** — `recordEvidenceArtifact` and
   `recordEvidenceDiscovery` have no caller outside `evidence.ts`.
4. **What it does for a player.** Nothing yet.
5. **What it reads.** The world.
6. **What it writes.** Artefacts and discoveries.
7. **What decides its behaviour.** An artefact establishes a fact; discovering it
   is a separate event.
8. **Worked example.** None in play.
9. **What it cannot do.** Be reached. There is no "you found out" moment in the game.
10. **What breaks if it is wrong.** Nothing today.
11. **How to check it.** `src/simulation/evidence*` tests.

### SYSTEM 23 — INCIDENTS

1. **What it is.** Things that happen — to a person, or in a place — with
   transition plans.
2. **Where it lives.** `src/simulation/incidents.ts` (1,084),
   `incident-catalog.ts` (363), `incident-integrity.ts` (731).
3. **Status.** **[MAIN-SUBSTRATE]**
4. **What it does for a player.** `adult.incident-aftermath` and
   `adult.incident-neighbour-help` exist as authored beats, but nothing in play
   _creates_ an incident.
5. **What it reads.** The world.
6. **What it writes.** `recordActorInitiatedIncident`,
   `recordIncidentTransitionPlan`, `recordCausalProcess`.
7. **What decides its behaviour.** An incident has a catalogue entry and a plan.
8. **Worked example.** None in play.
9. **What it cannot do.** Be triggered by anything a player does.
10. **What breaks if it is wrong.** Two of the 35 adult situations can never fire.
11. **How to check it.** `report:life` over many seeds — incident beats never appear.

### SYSTEM 24 — WORLD METRICS AND CAUSAL EFFECTS

1. **What it is.** Measurable facts about the world, and the processes that change
   them.
2. **Where it lives.** `src/simulation/world-metrics.ts` (1,397),
   `causal-effects.ts` (1,448).
3. **Status.** **[MAIN-SUBSTRATE]**
4. **What it does for a player.** Nothing yet.
5. **What it reads.** The world.
6. **What it writes.** `recordWorldMetricObservation`, `recordWorldMetricState`,
   `recordEvaluatedMetricState`, `recordCausalProcess`.
7. **What decides its behaviour.** A metric state is evaluated, not asserted.
8. **Worked example.** None in play.
9. **What it cannot do.** Be reached. No policy in the game changes a measurable.
10. **What breaks if it is wrong.** Nothing today — the largest single piece of
    unreached machinery after vitality.
11. **How to check it.** `src/simulation/*metrics*` and `*causal*` tests.

---

## GROUP FOUR — NARRATIVE COMPOSITION

### SYSTEM 25 — CHARACTER HISTORY (THE FORMATIVE BANK)

1. **What it is.** The growing-up years: 19 authored situations, 49 options, and
   the writes each one makes.
2. **Where it lives.** `src/simulation/character-history.ts` (2,986 lines).
3. **Status.** **[MAIN-PLAYABLE]**
4. **What it does for a player.** Lets them play a childhood rather than skip it.
5. **What it reads.** The world, the person, the age.
6. **What it writes.** Events, memories, appraisals, relationship interactions,
   temporary states, and the whole life substrate.
7. **What decides its behaviour.** Age bands plus record-based eligibility.
8. **Worked example.** `formative.lunch-table` — a childhood social beat.
9. **What it cannot do.** Carry a named childhood choice into adulthood; also, it
   is the home of `generateQuickCharacterHistory`, whose cold-start uniformity is
   the known upstream gap (Chapter 7).
10. **What breaks if it is wrong.** Two cold starts feel the same. This is the
    live known defect.
11. **How to check it.** `report:life` with two different seeds, both at age 5.

### SYSTEM 26 — ADULT SITUATIONS

1. **What it is.** 35 authored adult situations with 102 options.
2. **Where it lives.** `src/simulation/adult-situations.ts` (2,737 lines).
3. **Status.** **[MAIN-PLAYABLE]**
4. **What it does for a player.** The everyday texture of an adult life: home,
   work, money, friends, community, politics.
5. **What it reads.** `buildAdultLifeContext(world, personId)`.
6. **What it writes.** An event with a `choice.` tag, plus the option's `writes`
   (`take-on-commitment` → `recordLifeCommitment`; `join-community-organization`
   → `createOrganizationParticipation`), plus the aftermath schedule.
7. **What decides its behaviour.** _Opportunity, not rate._ The module's own note:
   _"an adult situation is offered because the world already contains the thing it
   is about … and never because a die said this year was the year."_
8. **Worked example.** `adult.community-building`, stakes `pressing`, 4 options,
   chosen in the traced life for reason `current-relevance`.
9. **What it cannot do.** Write a relationship interaction. See 60C, Diagram 1.
10. **What breaks if it is wrong.** Beats about things that are not in the world.
11. **How to check it.** `report:life`, the "Composition against canon" section.

### SYSTEM 27 — EPISODE BANK AND LIFE EPISODES

1. **What it is.** Nine multi-stage families — 32 stages, 87 options — that run as
   instances bound to specific people, across months or years.
2. **Where it lives.** `src/simulation/episode-bank.ts` (2,206),
   `src/simulation/life-episodes.ts` (1,540).
3. **Status.** **[OPEN-PR #87]**
4. **What it does for a player.** The thing that makes a life feel continuous: a
   problem that comes back, with the same person, changed by what you did last time.
5. **What it reads.** `episodeFacts()` (13 fact keys), `episodeRoleBindings()`
   (5 roles), `playedEpisodeStages()`, the narrative threads.
6. **What it writes.** Events tagged `episode:`, `episode-stage:`,
   `episode-instance:` and `choice.`, plus the option's `writes` and aftermath.
7. **What decides its behaviour.** The ten-kind requirement grammar (Chapter 2).
8. **Worked example.** The full trace in Chapter 2, and 60C Diagram 4.
9. **What it cannot do.** Make a beat in one family depend on a stage of another,
   in shipped content — though `after-stage` could express it.
10. **What breaks if it is wrong.** A stage fires for the wrong instance, and a
    scene about your housemate is about your colleague.
11. **How to check it.** `report:life`, the `episodeInstances` block at the end.

### SYSTEM 28 — NARRATIVE THREADS

1. **What it is.** A projection over history that notices which records belong
   together.
2. **Where it lives.** `src/simulation/narrative-threads.ts` (1,104 lines).
3. **Status.** **[OPEN-PR #87]**
4. **What it does for a player.** "What is still open", recurring people, and the
   sense that the game is keeping track.
5. **What it reads.** `world.history`.
6. **What it writes.** **Nothing.** It is an index, not a store.
7. **What decides its behaviour.** _Two records being near each other in time is
   not a link._ A thread exists only on a declared `ThreadLinkBasis`.
8. **Worked example.** Diagram E.
9. **What it cannot do.** Infer a connection. By design.
10. **What breaks if it is wrong.** The game claims a causal link that does not
    exist — the one unrecoverable lie.
11. **How to check it.** `report:life`, the `threads` and `threadTitles` blocks.

### SYSTEM 29 — SITUATION SELECTION

1. **What it is.** The single ranking that chooses one beat from three sources.
2. **Where it lives.** `src/simulation/situation-selection.ts` (364),
   `situation-profiles.ts` (301), `life-eligibility.ts` (123).
3. **Status.** **[MAIN-PLAYABLE]**, extended by **[OPEN-PR #87]** to accept
   `episode:${string}` keys.
4. **What it does for a player.** Decides what happens next.
5. **What it reads.** Eligibility, causal availability, the player model,
   recent history.
6. **What it writes.** Nothing; it returns a choice and a trace.
7. **What decides its behaviour.** The seven-stage pipeline in Diagram C. When a
   beat is causally due, the player model stands down.
8. **Worked example.** _"Chosen: `episode:home.the-week-that-does-not-balance
[household-companion=person_3b7a8a8aa16b45dc]/the-first-time-it-is-said` from 3
   candidates (2 composed, 1 authored). Selector's reason: cross-pressure. The
   player model decided the ranking."_
9. **What it cannot do.** Explain itself to a player — the trace is developer-only,
   enforced by the opacity test.
10. **What breaks if it is wrong.** The game feels either random or on rails.
11. **How to check it.** `report:life`, every "Beat —" header.

### SYSTEM 30 — LIFE CALLBACKS AND AFTERMATH

1. **What it is.** The system that lets a choice come back.
2. **Where it lives.** `src/simulation/life-callbacks.ts` (558 lines).
3. **Status.** **[MAIN-PLAYABLE]**
4. **What it does for a player.** Makes a promise mean something nine months later.
5. **What it reads.** The option's `aftermath`, the counterpart, work and
   organization records, and the recorded relationship interactions.
6. **What it writes.** A scheduled future due item, then either an event or a
   terminal state with one of six reasons.
7. **What decides its behaviour.** Three questions: can this kind of thing come
   back; is there somebody or something for it to attach to; would anybody have
   been in a position to notice. _"A no to any of them is a real answer with a
   reason, not a failure."_
8. **Worked example.** Chapter 1, and 60C Diagram 1.
9. **What it cannot do.** Be scheduled by a conversation. Only situation and
   episode options carry an aftermath.
10. **What breaks if it is wrong.** Either nothing ever comes back, or everything
    does, and both are wrong.
11. **How to check it.** Choose something with a promise in it, then press "Let
    time pass" repeatedly and watch for it.

### SYSTEM 31 — LIFE NARRATION

1. **What it is.** The connective prose between beats.
2. **Where it lives.** `src/presentation/life-narration.ts` (668 lines).
3. **Status.** **[OPEN-PR #87]**
4. **What it does for a player.** Turns a sequence of scenes into a life.
5. **What it reads.** Elapsed days, open threads, recurring people, whether
   anything actually moved.
6. **What it writes.** Nothing; it returns sentences with a `NarrationSource` each.
7. **What decides its behaviour.** A steady-state line is emitted **only** when
   nothing moved **and** the gap is at least 25 days, with a deterministic rotation
   so four quiet gaps do not read identically. There is also an explicit `opening`
   mode so a brand-new life is not told that years have passed.
8. **Worked example.** _"A month later."_ — source: date arithmetic only, no record.
9. **What it cannot do.** Say anything the records do not support.
10. **What breaks if it is wrong.** The game repeats itself, which was a real
    defect found by probe during this wave and fixed.
11. **How to check it.** Manual tests 3 and 4 in Chapter 13.

### SYSTEM 32 — LIFE STORY (THE PLAY SURFACE PROJECTION)

1. **What it is.** The single function that answers "what is on screen right now."
2. **Where it lives.** `src/presentation/life-story.ts` (636 lines).
3. **Status.** **[OPEN-PR #87]**
4. **What it does for a player.** It is the play screen.
5. **What it reads.** The world and the person.
6. **What it writes.** Through `chooseStoryOption` and `letStoryTimePass`, it
   delegates to the simulation; the projection itself writes nothing.
7. **What decides its behaviour.** Four scene kinds — `episode`, `formative`,
   `adult`, `ordinary-stretch` — chosen by the selector.
8. **Worked example.** `lastRecordedMoment()` counts only events tagged `choice.`,
   which is what stops a new life reporting elapsed years.
9. **What it cannot do.** Cache. Every render is a fresh reading of canonical state.
10. **What breaks if it is wrong.** The screen and the world disagree.
11. **How to check it.** Manual test 2 in Chapter 13.

### SYSTEM 33 — LIFE RECORD (THE JOURNAL)

1. **What it is.** A chaptered reading of a life.
2. **Where it lives.** `src/presentation/life-record.ts` (293 lines).
3. **Status.** **[OPEN-PR #87]**
4. **What it does for a player.** Lets them look back without scrolling a log.
5. **What it reads.** `world.history`.
6. **What it writes.** Nothing.
7. **What decides its behaviour.** Four-year chapters (`CHAPTER_YEARS = 4`), and
   `readable()` suppresses any entry whose summary is under twelve characters.
8. **Worked example.** Three parts: what has happened, who is in this life, what
   is still open.
9. **What it cannot do.** Show a conversation as a conversation; five turns read
   as five events.
10. **What breaks if it is wrong.** The journal becomes the debug log it replaced.
11. **How to check it.** Manual test 7 in Chapter 13.

---

## GROUP FIVE — THE PLAYER MODEL

### SYSTEM 34 — PENNYWISE (THE PLAYER MODEL)

1. **What it is.** Fourteen dimensions describing how this player plays.
2. **Where it lives.** `src/simulation/player-model.ts` (663 lines, 36 exports).
3. **Status.** **[MAIN-PLAYABLE]**
4. **What it does for a player.** Ranks eligible beats so the game offers things
   they engage with — including things that push back.
5. **What it reads.** Setup priors and gameplay choices.
6. **What it writes.** Nothing canonical; it is computed on demand.
7. **What decides its behaviour.** `EVIDENCE_WEIGHT` — setup 0.25, stated 0.6,
   enacted 1.2. `DIMENSION_POLES` gives each dimension two named ends.
8. **Worked example.** Chapter 6's full trace.
9. **What it cannot do.** Appear anywhere a player can see it.
10. **What breaks if it is wrong.** The game either confirms you constantly or
    ignores you.
11. **How to check it.** `report:life`, the `modelSalience` block.

### SYSTEM 35 — SETUP QUESTIONNAIRE (THE CALIBRATION)

1. **What it is.** The adaptive opening questionnaire.
2. **Where it lives.** `src/simulation/setup-questionnaire.ts` (751 lines, 35
   exports).
3. **Status.** **[MAIN-PLAYABLE]**, substantially rewritten by **[OPEN-PR #87]**
4. **What it does for a player.** The opening of a life, not a survey.
5. **What it reads.** The bank, the answers so far, the model so far.
6. **What it writes.** Setup priors.
7. **What decides its behaviour.** `INFORMATION_GAIN_FLOOR = 0.9`,
   `SUFFICIENT_DIMENSION_WEIGHT = 1.2`, `DEEP_PATH_MINIMUM = 12`,
   `LIVED_REGISTERS_BEFORE_WIDENING = 5`, `REGISTER_GATE_PENALTY = 50`.
8. **Worked example.** Chapter 6; 19 questions for `audit-seed`, stopping reason
   `information-gain-floor`, best remaining 0.87.
9. **What it cannot do.** Tell you how long it will be, because it does not know.
10. **What breaks if it is wrong.** Either an interrogation or a model with no
    evidence in it.
11. **How to check it.** Manual test 1 in Chapter 13.

### SYSTEM 36 — THE SETUP BANKS

1. **What it is.** 53 calibration items with 198 options, across two modules.
2. **Where it lives.** `src/simulation/setup-questionnaire-bank.ts` (1,799,
   26 legacy items), `src/simulation/setup-opening-bank.ts` (1,461, 27 items).
3. **Status.** **[MAIN-PLAYABLE]** (legacy) / **[OPEN-PR #87]** (opening bank)
4. **What it does for a player.** The actual questions, with recurring named
   people — Dana, Marcus, Priya, Ray, Ms. Whitfield, Curtis, Nell.
5. **What it reads.** Nothing.
6. **What it writes.** Nothing.
7. **What decides its behaviour.** Every item declares an `AuthoredSource`, a
   `TransparencyReview`, one of six `QuestionnaireRegister` values, an
   `observationWeight`, and either a fixed ordinal or null.
8. **Worked example.** Three fixed openers in order: `kitchen_late`,
   `marcus_and_the_trip_fund`, `priya_reference`.
9. **What it cannot do.** Hide its axis from a politically literate player in 15
   of 53 items, which the data says out loud with `policy-docket-flagged`.
10. **What breaks if it is wrong.** The calibration measures the wrong thing.
11. **How to check it.** `report:life`, "What each answer moved".

### SYSTEM 37 — SETUP PRIORS

1. **What it is.** The half of a new game that comes from the player's answers,
   kept separate from the half that comes from the world seed.
2. **Where it lives.** `src/simulation/setup-priors.ts` (188 lines).
3. **Status.** **[MAIN-PLAYABLE]**
4. **What it does for a player.** Makes the calibration matter without letting it
   change the world.
5. **What it reads.** The questionnaire outcome.
6. **What it writes.** Priors carried in the replay descriptor.
7. **What decides its behaviour.** Priors are deliberately **not** part of
   `worldSeedFor`.
8. **Worked example.** Two players with the same seed but different answers get
   the same world and different models.
9. **What it cannot do.** Change who your housemate is.
10. **What breaks if it is wrong.** Changing an answer silently changes the world,
    and replay becomes unverifiable.
11. **How to check it.** Manual test 9 in Chapter 13.

### SYSTEM 38 — LIFE CHOICE EVIDENCE

1. **What it is.** The bridge that turns a chosen option into player-model evidence.
2. **Where it lives.** `src/simulation/life-choice-evidence.ts` (407 lines).
3. **Status.** **[MAIN-PLAYABLE]**, extended by **[OPEN-PR #87]** with
   `EpisodeChoice`, `episodeChoiceFromEvent()`, `episodeChoiceEvidence()`.
4. **What it does for a player.** Makes what they _do_ count five times more than
   what they _say_.
5. **What it reads.** Events carrying a `choice.` tag, and the option's `nudges`.
6. **What it writes.** Nothing; it produces evidence for the model.
7. **What decides its behaviour.** Gameplay evidence is enacted strength (1.2).
8. **Worked example.** From the traced life, `care-obligation` reached 0.427 from
   4 setup observations and 3 gameplay ones.
9. **What it cannot do.** Read a conversation turn. Conversations produce no
   player-model evidence.
10. **What breaks if it is wrong.** The model never learns from play.
11. **How to check it.** `report:life`, `fromSetup` vs `fromGameplay`.

---

## GROUP SIX — CONVERSATION AND DECISION

### SYSTEM 39 — THE CONVERSATION ENGINE

1. **What it is.** The turn-based dialogue system.
2. **Where it lives.** `src/presentation/run-b-conversation.ts` (1,904 lines).
3. **Status.** **[MAIN-PLAYABLE]** for one subject; **[MAIN-SUBSTRATE]** for four.
4. **What it does for a player.** One household conversation about who does the
   week's errands.
5. **What it reads.** The room, the subject's progress, the world.
6. **What it writes.** Six record kinds — see Diagram D.
7. **What decides its behaviour.** Intents are open strings, validated against
   what the subject is offering this turn.
8. **Worked example.** 60C Diagram 2.
9. **What it cannot do.** Fifteen things, listed in 60C Part 6.
10. **What breaks if it is wrong.** Somebody hears something they should not have.
11. **How to check it.** `npm run test:run-b`; `?view=office-fixture` for the rest.

### SYSTEM 40 — CONVERSATION SUBJECTS

1. **What it is.** The five things there are to talk about, each owning its own
   vocabulary and its own commit contract.
2. **Where it lives.** `src/presentation/conversation-subjects.ts` (874 lines).
3. **Status.** **[MAIN-PLAYABLE]** for `household-obligation`; the rest
   **[MAIN-SUBSTRATE]**.
4. **What it does for a player.** Decides what the buttons say.
5. **What it reads.** The progress object.
6. **What it writes.** Through the commit contract: the event type, tags, setting,
   social context, pressure, choice text, motivation and interaction tags.
7. **What decides its behaviour.** _"What this turn writes is the subject's
   business, not the engine's. A household deciding who does the shopping used to
   leave casework history."_
8. **Worked example.** `householdObligationSubject` writes household-tagged events;
   `referralSubject` writes casework-tagged ones.
9. **What it cannot do.** Vary its lines. `selectAuthoredVariant` exists and is
   unused.
10. **What breaks if it is wrong.** A kitchen conversation appears in a casework
    history.
11. **How to check it.** `?view=office-fixture` and switch subjects.

### SYSTEM 41 — DECISIONS AND DURABLE DECISION TRACES

1. **What it is.** An NPC actually deciding something, with the reasoning kept.
2. **Where it lives.** `src/simulation/decisions.ts` (692 lines).
3. **Status.** **[MAIN-SUBSTRATE]** — reached only by the office subject's two
   intents, on a developer route.
4. **What it does for a player.** Nothing reachable today.
5. **What it reads.** The NPC's own recorded state.
6. **What it writes.** A decision evaluation and a durable trace.
7. **What decides its behaviour.** `assertNpcAutonomousApplication` guards it: an
   NPC must be genuinely able to decide before a decision is evaluated.
8. **Worked example.** `request-commitment` on the intake checklist returns
   `commit` or `defer` depending on the NPC, not the intent.
9. **What it cannot do.** Be reached in shipped play.
10. **What breaks if it is wrong.** NPCs would be puppets that look like agents,
    which is worse than puppets that look like puppets.
11. **How to check it.** `?view=office-fixture`, press "request a commitment"
    across several seeds.

### SYSTEM 42 — CLAIMS AND EVENT KNOWLEDGE

1. **What it is.** What was said, and who was told.
2. **Where it lives.** `src/simulation/records.ts` (421 lines).
3. **Status.** **[MAIN-PLAYABLE]**
4. **What it does for a player.** Makes the difference between witnessing and
   hearsay a real thing the world records.
5. **What it reads.** An event.
6. **What it writes.** Claims and knowledge records.
7. **What decides its behaviour.** Direct knowledge is `accurate`; told-by
   knowledge is `unknown` and names its source.
8. **Worked example.** Chapter 4.
9. **What it cannot do.** Express a lie — `relationshipToTruth` is always
   `"unknown"` today.
10. **What breaks if it is wrong.** The game claims somebody knows something
    because they were told it.
11. **How to check it.** `?view=developer` → EventHistory.

---

## GROUP SEVEN — POLITICS

### SYSTEM 43 — LEGISLATION AND LEGISLATURE RULES

1. **What it is.** Bills, committees, votes, enactment, executive action, and the
   institutional rules that govern them.
2. **Where it lives.** `src/simulation/legislation.ts` (2,592 lines, 57 exports),
   `legislature-rules.ts` (713, 41 exports), `legislature-rule-packs.ts` (958),
   `legislation-scenarios.ts` (732), `legislation-integrity.ts` (507).
3. **Status.** **[MAIN-PLAYABLE]** when the character works for a legislature
   with an accepted rule pack — Kentucky, Nebraska or Alaska.
4. **What it does for a player.** A real legislative workspace with real procedure.
5. **What it reads.** The rule pack for the jurisdiction, the scenario, the world.
6. **What it writes.** `recordCommitteeDisposition`, `recordConcurrenceVote`,
   `recordEnactment`, `recordExecutiveAction`, `recordAdjournmentDeath`.
7. **What decides its behaviour.** Rules are runtime data per jurisdiction, with
   no jurisdiction-specific facts in the rules module itself.
8. **Worked example.** `advanceWorld(world, 7, HEARING_HANDLERS)` schedules and
   resolves a committee hearing as a real future due item.
9. **What it cannot do.** Be influenced by any conversation. See 60C, D-09.
10. **What breaks if it is wrong.** A player is shown another state's procedure.
11. **How to check it.** `npm run test:e2e -- legislation.spec.ts`, or start a life
    with "legislative office" in Kentucky.

### SYSTEM 44 — POLITICS, BELIEFS AND ELECTIONS

1. **What it is.** Private beliefs, public positions, principles, proposition
   exposure, campaign commitments, and election contests.
2. **Where it lives.** `src/simulation/politics.ts` (779),
   `political-belief-formation.ts` (627), `election-contests.ts` (925),
   `policy-semantics.ts` (2,571), `policy.ts` (658), `policy-decision.ts` (247).
3. **Status.** **[MAIN-SUBSTRATE]** — reachable only from the CLI demo and
   developer routes. Campaigns and a first election are **[OPEN-PR #85]**, which
   this wave was explicitly carved out of.
4. **What it does for a player.** Nothing reachable today.
5. **What it reads.** The world.
6. **What it writes.** `recordPrivateBelief`, `recordPublicPosition`,
   `recordPrinciple`, `recordPropositionExposure`, `recordSubjectKnowledge`,
   `recordCampaignCommitment`, plus the seven policy recorders.
7. **What decides its behaviour.** A public position and a private belief are
   separate records, which is the whole point.
8. **Worked example.** `npm run demo -- validation-seed` exercises them.
9. **What it cannot do.** Be reached in play. **NPCs in the shipped game hold no
   political beliefs.**
10. **What breaks if it is wrong.** Nothing today.
11. **How to check it.** `?view=developer` → PoliticalProfile.

---

## GROUP EIGHT — PRESENTATION, GRAPHICS AND PERSISTENCE

_(Summarised here; 60B is the full treatment.)_

### SYSTEM 45 — SCENE REGISTRY AND ENVIRONMENT SPECS

Three registered scenes, one with production art, none reachable in play.
`src/presentation/scene-registry.ts`, `src/environment/`. **[MAIN-SUBSTRATE]**

### SYSTEM 46 — CHARACTER COMPONENTS AND POSE FAMILIES

A complete modular character system — 18 landmarks, 4 posture classes, 5 facings,
contact contracts — with 25 approved production masters that are unreleased.
`src/presentation/character-components.ts` (2,103), `pose-families.ts` (1,091).
**[MAIN-SUBSTRATE]** / **[BANKED]**

### SYSTEM 47 — RASTER TIERS AND SCENE TRANSFORM

Four-tier ladder, camera locked across 13 viewports and 3 device pixel ratios,
fully tested. `raster-tiers.ts`, `scene-transform.ts`, `scene-placement.ts`.
**[MAIN-SUBSTRATE]**

### SYSTEM 48 — THE ASSET FACTORY

Intake, validation, QA, inventory, tier derivation, scene scaffolding, chroma
extraction, dynamic surfaces, external packs, asset lineage.
`src/authoring/*`, `scripts/art-asset-factory/*` — 14 CLI commands.
**[MAIN-SUBSTRATE]** / **[BANKED]**

### SYSTEM 49 — BROWSER SAVE STORE

Tombstones, quarantine, defect taxonomy, cross-tab reconciliation, autosave and
flush. `src/presentation/browser-world-repository.ts` (1,549). **[MAIN-PLAYABLE]**

### SYSTEM 50 — SQLITE WORLD REPOSITORY

The non-browser persistence path. `src/persistence/sqlite-world-repository.ts`.
**[MAIN-SUBSTRATE]**

---

# PART FOUR — GLOSSARY

**Action sequence** — a counter on the world that increases with each player
action. Handlers are forbidden from changing it, which is one of the six checks
that make time advance safe.

**Aftermath** — what a choice may leave behind: an obligation, a grievance,
goodwill, or standing. Most choices leave nothing, and that is deliberate.

**Audibility** — how loudly something is said: normal, quiet, or private. It
decides who is recorded as having heard it. Built, tested, and not reachable in
the shipped game.

**Beat** — one screen of authored prose with two to four choices. There are 139.

**Canonical / canonical truth** — what actually happened, as opposed to what
anybody believes about it. The game keeps these strictly apart.

**Canonical JSON** — a JSON writer that emits keys in a fixed order, so two
identical worlds produce identical bytes.

**Causal input** — one reason a beat was offered, kept with the record ids that
satisfied it. A beat with three reasons keeps three, never one summary.

**Claim** — something somebody said, recorded with a speaker, an audience, and a
relationship to truth.

**Cross-pressure** — when the game deliberately offers something that pushes
against what the player has shown it, rather than only confirming them.

**Dormant** — a thread with no new record for 400 days. Dormant is a real state a
life has; the thread is never deleted.

**Enacted / stated / setup** — the three evidence strengths for the player model:
1.2 for doing, 0.6 for saying in-game, 0.25 for saying at setup.

**Episode family** — one of the nine multi-stage authored stories. A _stage_ is
one step; an _instance_ is one run of the family bound to specific people.

**Event** — the atom of "something happened", with participants who each carry a
role saying how they were involved.

**Formative years** — ages 5 to 18, played as beats rather than summarised, if the
player chooses that depth at setup.

**Future due item** — something dated that will happen. It resolves when time
passes over its date, and `advanceWorld` refuses to skip one it cannot handle.

**Instance key** — which run of an episode family this is, including who is bound
to which role. Example:
`home.the-week-that-does-not-balance[household-companion=person_3b7a8a8aa16b45dc]`.

**Journal** — the chaptered reading of a life: what has happened, who is in it,
what is still open. A view, not a log.

**Knowledge** — what a particular person learned, and how. Direct knowledge is
`accurate`; hearsay is `unknown` and names its source.

**Life callback** — the mechanism that brings an aftermath back, or closes it with
one of five honest reasons why not.

**Memory** — what a person carries away from a choice, written as something that
happened rather than as the button they pressed.

**Pennywise** — the internal name for the player model. Not a character; the
player never encounters the word.

**Perception** — an opinion one person holds, with a traceable link to the claim
and knowledge record that produced it.

**Provenance** — where something came from. Every composed sentence in the game
can name its source record, or say honestly that it read a person's own fields.

**Register** — one of six subject areas a calibration question belongs to. The
selector penalises asking two in a row from the same one.

**Replay descriptor** — the seed plus the setup priors, kept separate so that
changing a prior cannot silently change the world.

**Scene** — a registered room with measured geometry, a plate, occluders and
surface slots. Three exist; none is reachable in play.

**Situation** — an authored beat from the formative or adult bank. Not a
conversation; one choice and it closes.

**Stable key** — a deterministic key a writer chooses for a record. Writing the
same stable key twice is the same record, which is what makes replay idempotent.

**Standing** — for a thread: opening, running, pressing, dormant, or settled. For
an aftermath: a position taken where people could hear it.

**Subject** — one of five things there is to talk about in a conversation. Each
owns its own vocabulary and decides what its turns write.

**Thread** — several records the game has noticed belong together, on a declared
basis. Adjacency is never a basis.

**Thread link basis** — the four legitimate reasons two records belong to the same
thread: shared person, shared organization, shared record, shared stable key.

**Tier** — one of four raster sizes for a plate, chosen by viewport and device
pixel ratio.

**Transition handler** — the code allowed to resolve a particular kind of due item.
The registry passed to `advanceWorld` decides which kinds are permitted at all.

**World** — the whole game state, including its own complete history. A save is a
world.

---

_End of 60D._

# Adaptive Life and Setup

How the game decides what to put in front of a player, what it learns about
them while it does, and — the part that needs saying most plainly — what it is
not allowed to do with either.

This document covers the setup calibration, the non-diegetic player model, the
situation selector, the adult situation provider, and delayed callbacks. It
does not redefine anything the mind, life, relationships, resources, incidents
or legislation systems already own. Those systems decide what is true; this one
decides what gets offered.

## The three rules

**Selection is not resolution.** The adaptive layer chooses which of several
causally plausible situations a player is shown. What comes of a choice is
decided by the domain engines from world state. Nothing about _why_ a situation
was selected reaches anything that decides what follows, and
`life-callbacks.ts` cannot see the selector's reason or its stakes tier because
neither is in its input type.

**The player model is about the player, not the character.** Nothing in
`player-model.ts` is biography, memory, belief, personality or a value the
character holds. A character's canonical mind lives in `mind.ts` and is written
by things that actually happened.

**Uncertainty is held as uncertainty.** A single number per dimension can say
"unsure"; it cannot say "either a view about markets or a low opinion of what
this council delivers". Those are different states and the second is not
collapsed into the first.

## Setup calibration

`setup-questionnaire-bank.ts` holds the authored bank. Every prompt and every
option sentence came from a Drive research authority; none was written by the
implementing lane, because copy is where the measurement lives. The magnitudes
and dimension loadings _were_ derived here, from the prose direction and the
research's own primary/secondary coverage matrix, and are documented as a
reconstruction.

`setup-questionnaire.ts` implements the settled selection semantics: three
fixed openers in a fixed order; then the item that covers what the model knows
least, penalised 0.25 per dimension shared with the previous item, credited for
separating explanations that are still level, and tie-broken by a SHA-256 over
world seed, person, bank, encoding version, ordinal and candidate. It consumes
no simulation randomness. A skip records `choiceId: null`, contributes nothing,
and still advances the ordinal.

Two paths: a short one of five, and a longer one bounded by authored supply.
`setupContentShortfall()` reports the gap between the design target and what has
been authored, in numbers, rather than letting the long path quietly run short.

### Where the answers live

`World.setupPriors` — one optional, declared, non-diegetic field. Answers are
not `HistoricalEvent`s, memories, personal values, personality tendencies,
beliefs or party labels, and no canonical query reads them.

They are also kept out of `worldSeedFor`. `canonicalSetupEncoding` is the world
half — place, age, depth, starting life, household, names, seed — and only that
half reaches world generation. If an answer about tax entered the seed it would
change which household was generated and what the people in it were called, so
a political answer would manufacture a correlated family. Answers may change
what the game asks and what it offers. They may never change who your family is,
and `adaptive-life.test.ts` builds the same world from two opposite sets of
answers and compares the people.

A replay descriptor carries both halves, at setup encoding version 3.

## Evidence

Three tiers, from doc 90: `setup` (0.25), `stated` (0.6), `enacted` (1.2).
Roughly five to one between the ends, so two or three consequential choices in
the opposite direction carry an estimate past neutral. Nothing is deleted when
that happens — the trail is append-only, and a setup answer keeps its ordinal
and its item while ceasing to be the loudest voice.

`life-choice-evidence.ts` derives the whole model from canonical history every
time rather than caching it, which is what makes it survive a save: a world
loaded from disk yields the same model as one that was never put down.

## Selection

`situation-selection.ts` implements doc 90's order. Hard eligibility and causal
availability happen upstream, in the providers; what is left is current
relevance, cross-pressure strength, a novelty guard, a pacing guard, and a
deterministic tie-break.

Cross-pressure is authored beside the situation, as a claim that the moment
cannot give you both things, and it only bites when the player has shown they
care about both sides in the direction the situation threatens. Somebody with
no observed view on either is not cross-pressured; they are being asked a
question.

The stakes tier is a rationing input and nothing else. It says how much a moment
puts a player's own priorities in tension — a statement about the moment — and
says nothing about what will come of it. The two are allowed to diverge
completely, and that divergence is the requirement rather than a defect. It is
never rendered and never serialized, and both are pinned by tests.

## Adult situations

`adult-situations.ts` is keyed to opportunity, never to a rate. A situation is
offered when the thing it is about is already true — a household with somebody
in it, a job, a debt, a commitment made earlier, an incident the incident engine
actually produced. There is no arrival frequency anywhere in the bank, because
the research classifies almost every one of these families as having none that
is defensible.

A sparse life therefore gets a sparse offering, and that is the truthful answer
rather than a defect. What opens the rest is the player doing things:
volunteering writes an organization participation, which is what makes a
community situation possible later.

## Delayed callbacks

`life-callbacks.ts` decides whether anything follows, at resolution time and
from world state. When nothing follows, nothing follows _for a reason that is in
the world_ — the person who would have carried it is no longer anywhere the
player is, the commitment has ended, the position was taken where nobody was
listening — recorded as a cancellation reason on the delayed-transition
registry, not produced by a die that nullifies.

When a callback comes due and there is somebody on the other end of it, whether
they raise it is their decision, taken through `evaluateDecision` over the
relationship interactions the world already recorded. It is not a flag on the
content row that produced the moment.

## Commitments and leverage

`commitment-seam.ts` names the semantics an ordinary promise shares with PR
\#79's legislative commitment — firmness in words rather than odds, typed
conditions, and a standing derived from later canonical events — and reads them
out of records that already exist. It deliberately builds no second commitment
store. Its closing note says how to converge the two when \#79 lands.

`relationship-leverage.ts` derives which way dependency runs between two people
from roof, income, care, belonging and money owed. There is no stored score,
nothing accumulates, and no screen shows any of it. Deleting the file would
remove a reading, not a system.

## What is forbidden here

- no outcome preview on any situation option, and a test pins the option schema;
- no rendered stakes tier, selection reason, meter or delta;
- no arrival rate, hazard or occurrence probability in any content bank;
- no generative-AI dependency — every word a player reads is authored or
  templated over canonical state, and the game runs with no model available;
- no diagnostic label, ideology summary or personality type shown to a player;
- no questionnaire copy written by the implementing lane.

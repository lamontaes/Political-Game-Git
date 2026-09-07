# Adaptive Life and Setup

How the game decides what to put in front of a player, what it learns about
them while it does, and — the part that needs saying most plainly — what it is
not allowed to do with either.

This document covers the setup calibration, the non-diegetic player model, the
situation selector, the adult situation provider, delayed callbacks, and — added
by the narrative wave — the thread index, the episode families and the
connective narration that turn those into one continuous life. It does not
redefine anything the mind, life, relationships, resources, incidents or
legislation systems already own. Those systems decide what is true; this one
decides what gets offered and how it is told.

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

The bank is in two halves, and which half a piece of copy is in is checkable
from its `source`.

`setup-questionnaire-bank.ts` holds the research-derived items. Every prompt and
option sentence in it came from a Drive research authority. The magnitudes and
dimension loadings _were_ derived here, from the prose direction and the
research's own primary/secondary coverage matrix, and are documented as a
reconstruction. Two of its items are corrected in place — a deficit written as
"ten-million-dollar" and a grant item referring to a "central ministry", neither
of which any American jurisdiction has — because leaving a factual error
standing to preserve a provenance claim is the wrong trade.

`setup-opening-bank.ts` holds the copy authored under Packet 60 Section C, which
hands the calibration to the implementing lane and states the style direction:
a scene rather than a question, named people who recur, options that are actions
rather than arguments, and a third way that costs something legible. Its people
are not biography and create nothing in any world.

Every item carries a **register** — `lived-personal`, `lived-relational`,
`lived-moral`, `civic-lived`, `policy-lived` or `policy-docket` — and the
selector opens on the lived ones and widens into civic and policy only as the
model needs them. Items a human review named as abstractions keep their copy and
carry a verdict that ranks them behind everything that passed.

`setup-questionnaire.ts` implements the settled selection semantics: three
fixed openers in a fixed order; then the item that covers what the model knows
least, penalised 0.25 per dimension shared with the previous item, credited for
separating explanations that are still level, and tie-broken by a SHA-256 over
world seed, person, bank, encoding version, ordinal and candidate. It consumes
no simulation randomness.

**The deep path has no length.** It stops when it stops learning. The stopping
measure is deliberately not the ranking score, which never reaches zero and so
could never end anything: an axis contributes only while it is under-observed
and contributes nothing past `SUFFICIENT_DIMENSION_WEIGHT`, so once every axis
an item touches is covered, only an unresolved ambiguity keeps the run going.
Three answer patterns on one bank give runs of nineteen, twenty-two and
thirty-seven questions. A player is shown a phase, never a fraction, and there
is no per-question decline — somebody who does not want to answer starts the
life, which is one act rather than twenty refusals.

`setupContentShortfall()` reports the authored supply against the design target
and the count of items still ranked last, which is the remaining content debt.

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

## Threads, episodes and the telling

Three modules turn the above into a life rather than a sequence of cards.

**`narrative-threads.ts` is an index, not a second history.** Every thread
groups records already in `world.history`, and every grouping is justified by an
identity those records explicitly carry: the same counterpart named in the
participants, the same organization on the work relationship, the same event id
in a scheduled item's provenance, the same stable-key prefix written by one
writer. Two records being near each other in time is not a link and there is no
path here that treats it as one. Each anchor names its store, record id and
stable key, so a reader — or the causal inspector, which owns the inspection
surface and is not rebuilt here — can check every claim against the record.

A thread is allowed to be over. `standing` says which of opening, running,
pressing, dormant, settled or moot it is, and `standingReason` says why in the
record's own terms.

**`life-episodes.ts` composes beats from families rather than dealing cards.**
An episode family is stages, requirements, roles and exits; a beat is
instantiated by binding roles to people the world already contains. Four rules
hold, and the types enforce them:

- every requirement is answered from a canonical record, and the records that
  answered it come back with the beat;
- causes stack and stay separable — `causalInputs` is a list, one entry per
  requirement, so a beat cannot collapse into a single "because of X" tag;
- no destination is authored: escalation, recovery, dormancy, substitution and
  nothing-at-all are all reached the same way, by later requirements holding or
  not holding;
- the player model ranks and does nothing else. It is not an input to any
  function in that file.

A played beat writes ordinary canonical records tagged with the family, the
stage and the instance. Those tags are the entire mechanism by which a later
stage knows an earlier one happened; there is no episode store to fall out of
step with history. `episode-bank.ts` holds the authored families.

The first 92C content wave keeps those rules and narrows eligibility where the
old life bands were too broad. Every early-child stage declares both a numeric
age window and the context it needs. A child can act only on their own immediate
response; no child option writes a commitment or decides housing, money,
medical care, custody, employment or school placement. A role written as a
much younger household peer uses the same person's birth record both to satisfy
the under-age gate and to compose the line, so an older sibling cannot be cast
into that scene.

The adult-transition stages gate independently on paid work, enrollment,
kinship, familiar people, or an active incident. Enrollment does not identify a
program type, and the wave adds no occurrence rates. Long-tail stages require
the recorded earlier option, elapsed canonical time, and the same bound person;
when any prerequisite is missing, the stage is absent rather than filled with
an invented person or event. Independent moments join an accepted same-domain
family instead of receiving a fabricated answer-dependent continuation.

**`life-narration.ts` says what happened between the moments.** Every sentence
is derived from a record and carries the records it came from, so "composition,
not invention" is checkable. There is no branch that emits a contentless line: a
person has a place, a household and an age, so a quiet stretch is described by
what the life actually contained. Age is never a beat — a birthday appears as a
clause alongside something else. Quiet time passes unevenly and
deterministically, so two gaps do not read identically.

`life-story.ts` puts the formative bank, the adult bank and the composed beats
into **one** ranking, so a continuation can beat a stranger without always
beating one. `life-record.ts` is the journal: the same records, in chapters,
behind a control.

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
  development-time generated prose is admitted only with its stored fact packet,
  accepted output class and separate grounding-review PASS;
- no diagnostic label, ideology summary or personality type shown to a player;
- no thread, stage, instance or standing named on any player-facing surface;
- no causal edge drawn from adjacency — where the repository records no link,
  the thread index reports none;
- no second history, second commitment store, or second episode store.

`life-diagnostics.ts` answers the questions the game must stay silent about —
what the calibration moved, why a run stopped, why a beat was eligible, which
displayed sentence is composition and which is canon. It is a set of pure
functions returning data and Markdown, deliberately not a screen and not a
route, and `life-opacity.test.ts` fails if anything that renders imports it.

## Known gap

Two cold starts still produce the same life _shape_ and differ only in their
names: the same thread families, the same counts, the same eligible beats. The
narrative layer is reporting that faithfully — the cause is upstream, in
`generateQuickCharacterHistory`, which writes one fixed template for every
summarized life and lets the seed decide only the names inside it. Varying it is
a change to an accepted Stage 6 writer. The two lives do diverge structurally as
soon as they are played, because what happens writes records and records are
what threads and beats are read from, and
`narrative-life.test.ts` pins both halves of that — including the gap, so the
claim fails the day somebody closes it.

## C119B bounded grounding repair

The earlier 92C claims of sufficient grounding are corrected by the
[C119B scene audit](../plans/completed/c119b-grounding-audit.md). The inventory stays
16 of 62 researched kernels, with 46 outside-wave deferrals and 20 registered
triplets. Ten of those authored stages are withheld at runtime until their
actual local incident/activity, work, education, request, knowledge or
performance evidence can be bound. A prior yes is never completed work.

The childhood pact binds a familiar child in the same birth cohort before
computing the persistent instance key; its callback recalls only the recorded
agreement with that exact person. A later school scene asserts no enrollment
continuity. Immediate retained scene circumstances are preserved in the
ordinary resolution event, and stale selections are rechecked before writing.
No canonical records are invented for eligibility. Independent C119C acceptance
is pending; static review success is not runtime grounding approval.

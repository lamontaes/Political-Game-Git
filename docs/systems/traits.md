# Traits

**Status: PROPOSED.** This is the seam put in front of the owner before it is
built. Nothing described here exists yet. The five traits that exist today are
described as they are, and the proposal is marked as such throughout.

A trait is a fictional behaviour tendency: a recurring pattern in how a
character tends to act. It is not a measurement of a real person, not inferred
from anybody's name or place, and never shown to the player as a number. That
statement is unchanged and not up for negotiation by anything below.

## What exists today, and what is wrong with it

Five traits — deliberation, sociability, conflict, reliability, risk — are a
`as const` tuple in `src/simulation/people-trait-definitions.ts`, which yields a
`PeopleTrait` union type, which a hand-written `TRAIT_SHAPES` record must cover
exactly. Each is held as an ordinal −2…+2, drawn once from the person's own
seeded stream and written as an ordinary `PersonalityTendencyRecord` the first
time a decision needs it.

Eleven decisions consume them, each by calling `traitConsiderations` with an
array of leans written as a TypeScript literal at the call site:

```ts
traitConsiderations(world, personId, keyPrefix, [
  {
    optionKey: "accept",
    trait: "sociability",
    pole: "high",
    explanation: "They like seeing people.",
  },
]);
```

The contract that function implements is the right one and this proposal keeps
it verbatim: a lean is **additive**, it **cites** the trait record it rests on
in `sourceRefs`, it **contributes nothing** where no record exists, and it
**argues for** an option rather than vetoing one. Traits do not decide; they
put a reason on the table.

Four things are wrong, and only the fourth is a matter of taste.

**Adding a trait is an edit in several files.** The tuple, the shape record,
and anything that switches on the union. This is the same defect as the
character-pack list — a hand-written spread where adding one thing is edits
across four files — in a new place.

**There is an exact allow-list that rejects any trait it was not told about.**
`assertLifeMindContent` in `src/simulation/life-mind-content.ts` requires every
tendency definition a world carries to be byte-identical to one of the
built-ins. A newly registered trait throws `Unsupported production personality
definition`. This is the blocker: no amount of clean registration helps while
this stands. It is not removable — it is the only thing stopping a tampered
save redefining what a stored expression key means, so that an old record
decodes to something it never said. It is a validator with the wrong shape, not
a validator to delete.

**An unrecorded trait asserts a value anyway.** `personTrait` falls back to
`seededTraitValue` when there is no record, so it returns a value and a pole
word for a temperament the game never wrote down. Measured on an ordinary
opening life (seed `three-state-probe`, Kentucky, age 40): all 20 trait slots
across the 4 other people are unrecorded, and 12 of them still hand out a pole
word. `PersonCard.tsx` renders exactly that list without writing the traits
first, so the card today tells the player somebody is "Reserved" or
"Confrontational" on the strength of a number nobody observed.
`traitConsiderations` gets this right — it checks `recordId === null` and
contributes nothing. The card does not, because nothing makes it.

**Effects are literals at eleven call sites.** Nothing can answer "what reads
reliability?", nothing checks that a lean names an option its decision actually
offers, and a new effect on a new trait is an edit to somebody else's file.

## The proposal

Three registrations and one discipline.

### A trait is authored as data

A trait pack is data, not TypeScript. The game loads packs; it does not import
them.

```json
{
  "pack": "people-mind-v1",
  "traits": [
    {
      "key": "deliberation",
      "label": "Deliberation",
      "description": "How much someone thinks a choice through before acting.",
      "poles": {
        "low": { "key": "deliberative", "label": "Thinks it through" },
        "high": { "key": "impulsive", "label": "Acts on impulse" }
      },
      "scopes": ["life:ordinary"],
      "conferredBy": "seeded",
      "seed": { "spread": [-2, -1, -1, 0, 0, 0, 0, 1, 1, 2] }
    }
  ]
}
```

`pack` and `key` compose the stable key exactly as today —
`people-mind-v1:deliberation` — so **every record in every existing save
resolves unchanged**. That is a hard requirement, not a convenience: the five
traits ship as a pack whose contents are the current definitions character for
character, and a world made before this change is byte-identical after it.

`scopes` is a first-class field, not a convention. It says where this trait may
be read. An ordinary-life temperament declaring `["life:ordinary"]` cannot be
consulted inside a legislature until whoever owns the trait widens it, and that
widening is a visible edit to the trait's own declaration rather than an
invisible read somewhere else.

This is **not** the existing `scopeTags` on a record, and the two must not
blur. A record's `scopeTags` says where a reading _came from_ — what the writer
was doing when it established this. The declaration's `scopes` says where the
trait _may be read_. Both are needed and they answer different questions: one
is provenance, the other is permission. Note also that the five people traits
do not tag `life:ordinary` — they write `people-mind-v1.seed` and
`people-mind-v1.change`; it is the separate `life-personality.ts` tendency set
that writes `life:ordinary`. And `assertTags` checks only that a tag is
non-empty and not duplicated, so nothing today validates that a tag names
anything real, and nothing enforces either question.

`conferredBy` is `"seeded"`, `"player"` or `"conferred-only"`. The five are
`"seeded"`. See "The player's own temperament" below.

#### The value scale belongs to the pack, not to the store

A trait's value round-trips through the mind store as an `expressionKey` plus a
`MindStrength`. Today `encode`/`decode` in `people-traits.ts` hardcode one
mapping — balanced to `subtle`, ±1 to `moderate`, ±2 to `strong` — and that
mapping is a property of _these five traits_, not of the store. A pack declares
its own, and the framework owns the round-trip contract rather than assuming
five-point symmetry.

This closes a live asymmetry worth naming. `MindStrength` has four values and
`encode` never writes `defining`, but `decode` reads `defining` as 2, the same
as `strong`. So a record carrying `defining` — hand-authored, migrated, or
written by a pack that thought it meant something — decodes to a value
indistinguishable from `strong`, silently, with nothing anywhere saying so. A
pack declaring its own scale must declare every strength it uses, and a record
whose strength the pack does not declare is rejected at load, naming the row.

### An effect is authored as data, against a decision that publishes itself

The existing lean vocabulary is already data — `optionKey`, `trait`, `pole`,
`explanation`, four fields and no code. It moves from a literal to a row:

```json
{
  "effects": [
    {
      "decision": "contact.answer",
      "leans": [
        {
          "option": "accept",
          "trait": "people-mind-v1:sociability",
          "pole": "high",
          "explanation": "They like seeing people."
        },
        {
          "option": "decline",
          "trait": "people-mind-v1:sociability",
          "pole": "low",
          "explanation": "They keep to themselves."
        }
      ]
    }
  ]
}
```

For that to be authorable by somebody who cannot read the codebase, **the
decision has to publish itself**. This is the one piece that stays code, and it
is small: each of the eleven decision sites declares its identity, its scope
and the option keys it offers.

```ts
declareDecision({
  id: "contact.answer",
  scope: "life:ordinary",
  options: ["accept", "decline", "counter", "leave-it"],
});
```

That declaration is the enumerable surface. "What can a trait pack affect?" is
a list, generated, not a wiki page. The call site then reads:

```ts
traitConsiderations(world, personId, keyPrefix, leansFor("contact.answer"));
```

Same function, same additive contract, same `sourceRefs`. The array is loaded
rather than written.

### Where a trait's meaning depends on the situation

A lean is `{option, trait, pole, explanation}`, resolved once at load against
option keys a decision publishes. That works while a trait argues the same way
every time that option is on the table. It does not work when the same trait
and the same pole argue for opposite things depending on who is in what
position.

**The rule: when a trait's meaning depends on the situation, the situation
belongs in the option key, not in the lean.** A decision that cannot say which
situation it is in has nothing a lean can attach to, and no pack can repair
that from outside.

The legislation lane found this by trying, and it is worth recording in full
because it is the seam's main limit. Their "whose commitment binds" axis —
holds you to yours, against holds their own first — argues for pressing when
the commitment at stake was made _to_ the member and for letting it go when the
member made it. Same trait, same pole, opposite options, decided by who holds
what. In `src/presentation/legislative-bargaining.ts` the published intent is a
single `remind-of-commitment`; whether it resolves to
`confront-broken-commitment` or `defend-broken-commitment` is computed
afterwards, from `playerOwedIt`. So there is one option key, and the asymmetry
lives downstream of it where no lean can reach.

The fix is for the decision to publish the asymmetry as distinct options, which
is a product decision for whoever owns that room rather than a schema change
here. The alternative — a condition over situation state inside the lean — is
rejected: it is the door to arbitrary logic in data, and a pack language with
conditionals is a programming language nobody validated.

#### Two declarations, when the situation is which decision it is

The rule as first written assumed the option keys were the place to put the
situation. The legislation lane found the case it did not anticipate, and their
reading is the right one. A room may answer a request and answer an offer with
keys that already exist and are already right for the player — `hold-off` in
both — where the difference is not which answer is being given but which
question is being asked. Declining to say where you stand is not refusing a
version on the table.

There the answer is two `DecisionDeclaration`s for one piece of code, not a
rename of a player-facing option to satisfy a declaration. It serves the same
principle: what the rule prevents is one option key meaning opposite things
depending on state a lean cannot see, and two declarations prevent exactly
that, because `hold-off` in one room is a different key from `hold-off` in the
other and a lean has to name which. Renaming options the player reads, so that
a declaration can be tidy, is the wrong trade.

Stating the rule matters because without it the seam _looks_ like it can
express a relational trait and cannot. Better a constraint decision authors can
check than a limit the second consumer discovers.

### Who has a trait is not the same question as who may read it

`scopes` says which decisions may read a trait. It does not say which people
have one, and the two must not be conflated.

`conferredBy` answers the second:

- **`seeded`** — every person, drawn once from their own stream. The five
  ordinary-life traits. Universal by nature: everybody has some disposition
  toward risk.
- **`conferred-only`** — nobody has it until a system writes it. A trait that
  belongs to a role rather than to a person: a bargaining disposition is a fact
  about a legislator, and seeding it for every person in the world pays a
  record in every save for people who will never enter a members' room.
- **`player`** — declared, not implemented. See below.

**A `conferred-only` trait's conferral path is code in the system that owns the
role**, not a predicate in the pack. The legislature writes the disposition
when somebody becomes a member, because the legislature is what knows who its
members are. The pack declares that the trait is conferred; it does not declare
who qualifies, because eligibility is a fact about the world and a pack cannot
see the world.

That answers a question the legislation lane raised and it is worth being
explicit about the limit. A person who is not a legislator and a member nobody
has observed both read back **unrecorded**, and the trait system cannot tell
them apart. That is not a conflation to fix here: `unrecorded` truthfully means
"this world has not written this trait for this person", which is the case in
both. The difference is the consuming system's to know, and it knows it
already — it asks whether somebody is a member before it asks anything about
their disposition. A trait store that tried to answer "does this apply to
them?" would be guessing at a fact it does not hold.

What does belong here is the guard: only a declared conferrer may write a
`conferred-only` trait, so a record appearing for somebody who should never
have one is a rejection rather than a silence.

**A consumer establishes applicability before it reads the trait, not after.**
Because `unrecorded` truthfully means "this world has not written this", a
consumer that reads first and checks membership second is holding an
`unrecorded` for somebody the trait never applied to, and may render or reason
from it as though it were a fact about somebody it does. That is the person
card's defect in a new place, and the ordering is what prevents it.

### Loading is validated, row by row, and fails soft

Every rejection names the row and the reason, and is collected into a load
report rather than thrown. A pack with one bad row loads its other rows. The
game runs.

| The row says                            | What happens                                                                                                                                        |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| a trait no pack declares                | rejected, naming the trait key and that no pack declares it                                                                                         |
| a decision this build does not declare  | rejected, naming the decision — **this is the forward-compatibility case**: a pack written for a later build says so instead of crashing            |
| an option the decision does not publish | rejected, naming both. A well-formed identifier that matches nobody is the exact failure the regional-scene work hit; a shape check would pass this |
| a scope the trait does not permit       | rejected, naming the trait, its scopes and the decision's                                                                                           |
| a duplicate trait key within a pack     | the pack is rejected whole                                                                                                                          |

**Validation is at load, not at use.** A pack that passes load cannot produce a
lean that silently matches nothing, because every reference was resolved once,
against declarations that existed, at the moment it was read.

### The allow-list becomes a pack-identity check

`assertLifeMindContent` keeps its guarantee and changes shape. Today: _every
definition must be one of the built-ins._ Instead: **every definition a world
carries must be identical to the definition the pack that owns its stable key
declares.** Namespace before the first colon names the pack.

That is the same anti-tamper guarantee, and strictly stronger reporting — it
can say which field disagrees rather than "unsupported". It admits any trait
any loaded pack declares, and only those.

A world carrying records from a pack that is not loaded is the fail-soft case
and matters most: those records are **preserved and not consulted**, and the
report names the missing pack. They are never deleted. Removing a pack must not
destroy a save's history, in the same way removing a mod does not.

### Three states, not two

`personTrait` stops returning a bare value. It returns which of three things is
true, and the caller cannot avoid deciding:

- **unrecorded** — nothing was ever written. The seed is reachable separately
  as what it _would_ become, and is not a value.
- **recorded, balanced** — observed, and no marked lean. `label` is null.
- **recorded, leaning** — observed, with a value and a pole word.

This is the fix for the measurement above: the card cannot keep rendering pole
words for people whose temperament was never written, because the type stops
offering one. A missing observation stops being an assertion.

### The player's own temperament

Today the game refuses to author the controlled character's traits —
`ensurePeopleTraits` skips them, and the mind layer only accepts the player's
own choices as a change to that person. That refusal is correct and stays.

But today the seed still exists for them and `PersonCard` hides it with a
separate check, so the current behaviour is "present, never written, never
consulted, hidden by hand" — which is a side effect rather than a design.
Making it explicit: **the player has no trait records and no seed is drawn for
them.** `personTrait` returns unrecorded for the played character, always, and
the UI check becomes redundant rather than load-bearing.

`conferredBy: "player"` is declared in the schema and not implemented. A trait
a player picks for their own character is a real thing to want and this is the
field it would arrive through, but it needs an answer to "what consults it, and
when does a trait decide something for the player" that nobody has given yet.
Declaring the field and not implementing it is deliberate.

### Why this does not reuse `RuleValue<T>`

`legislature-rules.ts` already carries the project's three-way — known,
unknown-with-a-note, not-applicable — and a second vocabulary for absence is a
fair objection. Not adopting the type, for a stated reason.

`RuleValue`'s known arm carries a `RuleSourceRef`: a citation to an external
published rule. A trait reading's citation is a `tendencyRecordId` inside this
world's own history, which is not that kind of thing. And not-applicable and
unrecorded are genuinely different states: a chamber with no conference
procedure is not a chamber whose conference procedure nobody looked up. One
type over both would make the trait side carry a source kind it cannot fill and
an arm it cannot mean.

What is taken is the discipline rather than the type: a note is mandatory, no
reader may collapse two states into one, and `requireKnown`'s rule — that the
two absent states throw _different_ errors so a caller can never silently treat
one as the other — is the pattern the trait reader follows.

## Resistance: everybody changes, and not everybody equally

**BUILT**, in `trait-resistance.ts` and `people-trait-change.ts`. The owner's
requirement: "every character should be able to change with varying levels of
resistance." Nothing modelled resistance before — `recordTraitChange` took an
event and a reason and applied the new value outright, so the same event would
move every person by the same amount, and it had no production caller at all,
so nobody's temperament had ever moved.

### Resistance is read from a life, not stored as a hidden number

The tempting design is a second seeded number per person: how stubborn they
are. It is rejected. It would be one more fact the game asserts about somebody
without having observed it, which is the error this whole document keeps
circling, and it would explain nothing to a player.

`PersonalityTendencyRecord` already carries a `strength` — the word the store
writes to say whether a lean is subtle or defining — along with
`supersedesTendencyId` and `recordedAt`, so the chain of records for one person
on one trait _is_ that person's history on it. Resistance is read from that
chain:

- **How strongly the person holds it.** The owner's answer, 2026-09-22, to what
  the pacing should depend on: "it should just depend on how strongly that
  trait is to them." A faint lean and a defining one are not equally hard to
  shift, and the strength is already on the record, so saying it costs nothing
  new and asserts nothing unobserved.
- **How long the current value has stood.** Somebody who has been this way for
  nine years is not moved by one afternoon. Somebody whose value was written
  last month is more movable — though never free, because a value that resisted
  nothing the week it was written would let a character swing straight back.
- **What the pack says about the trait.** A pack declares how movable a trait
  is at all, because some dispositions are more fundamental than others, and
  that is the pack author's judgement rather than the engine's. Every number a
  change is weighed against lives in `TraitMovability`; the engine holds none
  of them.

Two people who have lived differently therefore resist differently, from
records that already exist. Nothing is invented, and the reason is always
sayable: _she has been like this for as long as anyone has known her, and she
holds it strongly._

**Retired, 2026-09-22: a permanent cost for every move ever made.** The first
shape added a fixed amount to resistance for each time a person's value had
already changed. It was there to stop oscillation and it did, but it also meant
somebody who had lived through things became progressively unreachable — a life
made of events ending in a character no event could touch, which is the
opposite of the requirement that every character can change. Oscillation is
held off by the settling clock instead. Prior moves are still counted and still
said out loud, because they are true about the person; they no longer harden
them.

### A change is a force meeting a resistance, and the failure is a fact

`recordTraitChange` gains a force: how strongly the event argues for the
change. If force exceeds resistance the value moves, as now. If it does not,
**the attempt is recorded rather than discarded** — an ordinary world event
saying this happened and did not change them.

That record is the point, not bookkeeping. It makes accumulated experience the
thing that moves people: one argument does not change somebody, and a life that
keeps arguing the same way does. It also keeps the game honest about what it
knows, because "this kept happening to her and she did not budge" is a fact
about a life, and a system that dropped the failures could never say it.

### Repetition is not evidence

**Corrected, 2026-09-22.** The first version of the paragraph above said "and
the same argument for the tenth time does", and the code meant it literally:
pressure was the number of failed attempts, added to the force without a bound.
Ten attempts in one afternoon therefore carried ten times the weight of one,
and persistence alone eventually moved anybody — a click counter wearing the
clothes of a life. Both halves are now bounded, and `traitChangePressure` reads
two things instead of counting attempts:

- **A separate experience.** An attempt from a context that already argued this
  way fewer than the pack's `experienceSpacingDays` ago is the same experience
  continuing, and adds nothing. The producer names the context — for a rebuffed
  ask it is who did the rebuffing — and it is written on the event, so the
  reason stays readable afterwards, and so one season can hold one experience
  from each of several people rather than one in total.
- **Time.** How many spacing periods separate the first counted experience from
  the last. This is the one that cannot be hurried, and it is what makes the
  whole thing a life: somebody becomes a person who reaches out less over years
  of being turned down, not over a fortnight of it.

The pressure is the smaller of the two, less one, because the first experience
is the thing that happened rather than pressure behind it. The pack then caps
the whole, which is what makes the guarantee statable: a value held as
`defining` resists the weakest force plus the maximum the cap allows, for as
long as anyone cares to keep at it, and moves only when something argues
harder. Both halves are asserted in `trait-resistance.test.ts`.

**Variety is deliberately not a gate of its own.** Requiring that several
different corners of a life argue before any of it counts reads well and was
proposed, but the running game has exactly one producer — being turned down by
the person you keep asking — so that rule would have left nobody's temperament
able to move at all. That is not a stricter rule, it is a dead one. Variety
reaches the count sooner instead.

### Two write paths, and which one play uses

`recordTraitChange` stays as it was: the authoring write, which applies a value
because something has already decided the change happened. Fixtures use it, and
so does anything that has settled the question elsewhere.

`attemptTraitChange` is the play path and the one anything in the running game
should use. It weighs a force against the resistance, applies the change when
the force wins, and records the attempt when it does not. Keeping both is
deliberate: a test arranging a person's temperament is not modelling a change,
and making it pretend to be one would have every fixture inventing a force it
does not mean.

### An unestablished trait does not move

`traitResistance` returns `unestablished` for a person with no record, and
`weighTraitChange` refuses to move one whatever force is brought. This is the
three-state discipline again, in the place it would have been easiest to miss:
a two-state answer would have made somebody nobody has observed maximally
movable, which is the softest possible reading of a life. Establishing a
temperament is authoring it, not changing it.

### A lifelong value is counted from a life, not from the write

The five people traits are seeded lazily — the record appears the first time a
decision needs it — so the record's own `recordedAt` is the day the game got
around to it, not the day the value started. Reading that date would make a
forty-year-old's lifelong temperament look written this morning, and one
passing argument would move anybody. So a value that has never been superseded
is counted from the person's birth. A value that superseded another is counted
from the day it was written, because that is genuinely when it started.

### What this does not do

It does not decide for anybody. A trait that moves changes what a person
_argues for_, never what they are allowed to do, and the additive, never-vetoing
contract above is untouched. And it does not move the played character's traits
from outside: see below.

## The player's own temperament

**BUILT**, in `people-player-traits.ts`, and a correction to the strict reading
above. The owner: the played character needs their own traits, because "it's
how you are portrayed to people."

The store's existing guard is right and stays. `validateMindProvenance` refuses
a record for the controlled person whose provenance is not `player-choice` — so
the game declines to _author_ who the player is. It never declined to let the
player _have_ a temperament. The seeding path writes `authored`, which is why
the played character comes back empty, and that emptiness was a side effect
rather than a decision.

What is missing is therefore not a weakening of that guard but two things it
always allowed:

- **A path that records the player's traits from the player's own choices**,
  written with `player-choice` provenance, citing the choice that established
  it. `conferredBy: "player"` is the pack field for this.
- **Consumers that read them when other people size the player up.** This is
  the owner's sentence almost word for word: a temperament matters because
  other characters perceive it. The player's own trait never argues for the
  player's own option — they choose — but it is available to everybody
  deciding what they think of them.

Both are built. `recordPlayerTraitChoice` writes with `player-choice`
provenance and refuses anybody but the controlled person, because saying who
somebody else is on the player's behalf is the thing the guard exists to
prevent.

The consumer side needed one addition to the seam. A lean row may declare
`about: "subject"`, meaning it reads the traits of the person being decided
about rather than the person deciding, and `contact.answer` now carries two
such rows: somebody weighing an ask reads whether the person asking keeps the
plans they make. A decision that names no subject drops those rows rather than
falling back to the actor, which would put one person's temperament in another
person's mouth.

### Ignoring it, and saying so

"Ignore it and say so. That shouldn't hold the game back." `playerTemperament`
returns `said` and `unsaid` rather than a value per trait, so a screen can tell
the player which parts of themselves they have never decided instead of showing
a seeded value they never picked or implying a middle they never chose. A
player who says nothing is simply somebody nobody has anything recorded about,
which every consumer already handles, because that is the same `unrecorded`
state as for anyone else the world has not observed. Nothing is blocked and
nothing is invented.

### What is deferred rather than decided

Whether the setup questionnaire's answers should also become the player's
temperament is a question about what a life looks like, not about what the code
can hold, so it is filed in `docs/research/TRAITS-OPEN-QUESTIONS.md` along with
the trait set itself and the pace of personality change.

## What this deliberately does not do

Said plainly, with what the next step would be.

**No file discovery.** Packs are loaded from a list the build provides. There
is no mod directory and nothing scans the disk. Next step: a loader that reads
a directory and appends to that list. The seam does not need rebuilding for it.

**A pack cannot invent a decision.** It can lean on decisions the game
declares; it cannot add one. A new decision needs authored options, prose and a
writer that records the outcome, which is a content seam rather than a trait
seam. RimWorld draws the same line: a trait mod is not a content mod.

**No weights beyond the existing two steps.** ±1 is "slight", ±2 is
"moderate", and a lean argues rather than vetoes. Keeping this until something
concrete needs otherwise; a pack that could set arbitrary strength could
effectively veto, and that is a different contract.

**Nothing changes until something is registered.** A person with no trait
records behaves exactly as today in every consuming system, and a build that
loads only the people pack is the build that exists now.

## Checking the seam against a consumer nobody designed for

The legislation lane has three bargaining axes — whose commitment binds, trade
or hold out, and what happens when the money runs out. They are the test, not
the shape.

Each is a decision with option keys. The lane declares them with
`declareDecision`, scope `government:bargaining`, and a pack leans on them. No
file in the people lane changes, which is the thing being tested.

The scope check bites, correctly: a lean citing `people-mind-v1:reliability`
inside `government:bargaining` is rejected until the people pack widens that
trait's `scopes`. That refusal is the feature. Whether reliability in ordinary
life is the same thing as reliability at a bargaining table is a real question,
and the seam makes somebody answer it in the trait's own declaration instead of
answering it by accident in a call site.

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

`conferredBy` is `"seeded"`, `"player"` or `"conferred-only"`. The five are
`"seeded"`. See "The player's own temperament" below.

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

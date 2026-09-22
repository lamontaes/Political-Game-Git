# Alaska both opens and refuses, because the two measurements are about different towns

Written 2026-09-22 ~08:30Z. This reconciles two measurements that have been
read as contradicting each other for most of the night, and it names what is
still not established so the reconciliation is not overread in its turn.

## The two measurements

**Alaska opens.** On `claude/district-residence-clock` at `5e6352e5` (that is
#292 with `main` `7fc33c85` merged in), a forty-year-old who has lived in
**Sitka** all their life is eligible for the Alaska House on **day zero** of an
ordinary life — no months let pass, no fixture. Pinned by
`src/presentation/playtest-candidacy-residence.test.ts :: lets a lifelong
resident stand for their own seat on day one`, which asserts an empty `blocks`
list and `eligible: true`. The life is built by `createExplicitGeographyLife`,
which calls the canonical `createNewGameWorld` with `startKind: "normal"`.

**Alaska refuses.** The browser fixture
`tests/e2e/support/jurisdictions.ts` records Alaska as `no-seats`, measured in
the browser by the fix-main lane.

## Why both are true

They are not about the same place. The engine measurement uses Sitka,
`placeKey` **0200650**. The browser fixture uses **Anchorage**, `placeKey`
**0203000** — a different row, a different town, and the difference is the
whole answer.

Sitka is a single house district. Anchorage is not: it spans many, so the
whole-place join cannot say which district an Anchorage resident lives in, and
the district residence requirement cannot be answered either way. That is the
same mechanism that refuses Columbus and Duluth, and it is deliberate — the
unknown stays unknown rather than being guessed.

So "Alaska opens" and "Alaska refuses" are both correct statements, and neither
generalises to the state. **The honest sentence is about a town, not a state.**
Alaska is a state where some lives can stand on day one and others cannot, and
which one you get depends on where the player said they were from.

This is the third time tonight an Alaska claim outran its measurement, and the
pattern is the same each time: a result measured on one input, restated with
the input dropped.

## What this does NOT establish

Stated at least as plainly as the part that is established:

- **The refusal sentence an Anchorage player actually reads is not confirmed
  here.** The fixture's own comment records it as "the world has no proved
  start date for that residence interval", which is the sentence #292 exists to
  remove; a relayed summary described it instead as the split-district sentence.
  Those are two different mechanisms and the difference matters. Nothing in
  this document resolves which one the current head renders, because it was not
  run in the browser here.
- **The filing screen is not measured on either head.** Everything above is
  `candidacyEligibility`. The engine agreeing with itself is not the screen,
  and that gap is exactly where three of tonight's retractions came from.
- **`nationwide-rule-coverage`'s `statesWithAnyStandForOfficeAdmitted` moving
  from 1 to 2** on the client line at `70fa13a7` is not explained here, and no
  commit is named for it. **Do not regenerate the committed coverage report to
  match that number until a commit is named.** A count regenerated to match an
  unexplained change stops being evidence and becomes a record of the change
  having happened, which is the one failure mode a committed artefact must not
  have.

## What would settle it

One browser run of the Anchorage row on `5e6352e5` reporting the rendered
sentence, and one on the client line reporting which Alaska office the coverage
report now counts as admitted, with the commit that changed it. Both are
measurements somebody else's lane is better placed to take, and neither should
be inferred from the engine.

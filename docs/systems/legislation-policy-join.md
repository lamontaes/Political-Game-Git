# What a Bill Is About

The join between a legislative measure and the policy question it concerns —
what was missing, what was measured, and what has been built so far.

## The finding

The bill lifecycle is finished. A player can file a measure, walk it through a
real chamber's recorded procedure, amend it, pass it, and have its fiscal effect
applied once and only once. It is roughly 2,700 lines of working legislative
machinery.

It runs on nothing. A new world's policy catalogue is empty by design (see
`policy-content-packs.md` for why that is deliberate and not an oversight), and
until this change nothing in the engine could have connected a bill to a policy
question even if the catalogue were full.

That second half is the part that had not been noticed, and it is the more
important half.

## What was measured

Six sites in the codebase create a legislative measure. Each was read
individually:

- `src/presentation/legislation-docket.ts:930`
- `src/presentation/legislation-world.ts:434`
- `src/presentation/tax-work.ts:47`
- `src/simulation/municipal-public-work.ts:1673`
- `src/simulation/legislation-scenarios.ts:732`
- `src/simulation/governing/legislative-clock.ts:706`

Not one of them passed a policy reference of any kind. There was no route to
pass. `IntroduceMeasureInput` carried no field for it, `LegislativeMeasureRecord`
stored none, and the only policy-adjacent link on a measure was
`policyAlternativeIds`, which is a different thing (below).

So the gap was not "the catalogue is empty and the bills have nothing to point
at". It was "the catalogue is empty **and** there is no pointer". Filling the
catalogue on its own would have produced a world holding a list of political
questions that no bill could ever be about, while every screen and every test
went on passing.

## The trap this avoided

The obvious reading of "the lifecycle is finished and the catalogue is empty" is
that the catalogue is the whole job. It is not, and doing only that half would
have been worse than doing neither, because it would have _looked_ complete: a
world with domains, issues and propositions in it, a legislature passing bills,
and no connection between the two that anybody would notice until they asked a
question the world could not answer.

## Why `policyAlternativeIds` was not the answer

A measure already had `policyAlternativeIds`, and reaching a proposition through
one was the tempting shortcut. It is wrong, and the reason is worth keeping.

A `PolicyAlternativeRecord` carries a quantitative operation: a named metric
moved by an exact amount, over a scope and a period, against a frozen baseline.
That is a real and useful thing, and most of what a legislature does is not it.
Whether rural transit should be funded at all, whether a licence should exist,
whether a duty should attach to an office — none of those is a number, and none
of them can be expressed as one without inventing the number.

Routing "what is this bill about" through the quantitative link would therefore
have forced every non-quantitative bill either to fabricate an operation or to
stay silent about its subject. Both are worse than a separate field.

## Why `subjectClass` was not the answer either

`LegislativeMeasureRecord.subjectClass` exists and is a closed union of exactly
three values: `general-policy`, `appropriation`, `revenue`
(`src/simulation/types.ts:3788`).

That is a procedural classification, not a topic taxonomy. It answers "which
constitutional track does this measure run on" — which chamber may originate it,
what majority it needs, whether it is subject to a fiscal rule. It does not and
cannot say what the bill concerns; `general-policy` is the answer for a transit
bill, an ethics bill and a licensing bill alike. Anyone looking for a subject
field would find this one first, which is exactly why it is worth writing down
that it is not one.

## What has been built (route 1)

A measure now names the policy propositions it is about, directly, alongside
`policyAlternativeIds` rather than through it. That claims one thing — _this
bill is about this question_ — and nothing more. It makes no assertion about
direction, magnitude, or effect.

- `LegislativeMeasureRecord.propositionIds?: readonly EntityId[]`. Optional, so
  measures in saves written before it existed stay structurally readable and
  read as measures about no recorded question rather than as broken records.
- `introduceMeasure` refuses a proposition id the world's catalogue does not
  hold, by name, before writing anything.
- `assertLegislationIntegrity` refuses one that goes missing later, so a
  tampered or partially-restored save fails rather than loading.
- `measurePropositions(world, measureId)` reads back the definitions that still
  resolve, skipping those that do not rather than throwing — a read-only query
  should not be what fails.

Nothing on screen changes yet, because the catalogue is still empty. This is
the join that a loaded catalogue will have something to attach to.

## What is still open

- **Nothing passes it yet.** All six call sites above still introduce measures
  with no proposition. Wiring them is real work and needs a catalogue with
  content in it first, or the wiring has nothing to reference.
- **Route 2, deliberately not started.** A proposition could also carry the
  measures that have addressed it, so a question could be asked "what has been
  done about this" without scanning every measure. It is the reverse index of
  route 1 and it is a bigger decision — it makes propositions mutable in a way
  they are not today. Not started on purpose, not forgotten.
- **Direction and position.** A bill being _about_ a question says nothing about
  which way it comes down on it. That is a separate field and a separate
  argument, and it should not be smuggled into this one.

## Owed

A `DECISION-LOG.md` entry, for the same reason as in `policy-content-packs.md`:
the log is one file and several lanes are merging tonight, so an appended entry
is a merge conflict on a train meant to be clicked through quickly.

## Where the code is

- `src/simulation/types.ts` — `propositionIds` on `LegislativeMeasureRecord`
- `src/simulation/legislation.ts` — validation, storage, `measurePropositions`
- `src/simulation/legislation-integrity.ts` — the integrity check
- `src/simulation/legislation-measure-subject.test.ts` — five tests

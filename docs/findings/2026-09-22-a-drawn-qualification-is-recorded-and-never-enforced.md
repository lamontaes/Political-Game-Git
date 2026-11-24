# A drawn qualification is recorded and never enforced

Measured 2026-09-22 ~13:40Z on `claude/nationwide-government-mqcw7p` at
`dc4735b3`, against `main` at `d956b92a`. This is a defect in this branch, not
in main.

## The measurement

Input: `resolvePlayGeography("7276770")` — San Juan, Puerto Rico — then
`createExplicitGeographyLife({ placeKey: "7276770", startAge, startKind:
"normal", depth: "begin-adult-life" })`, no time passed, and
`candidacyEligibility` for each chamber.

The pack this branch generates for Puerto Rico says, in its own record:

```
qualification.minimumAge = 23
  note: "Drawn from 21 to 24, the spread enacted by MN, MO, NJ, NV.
         Not a claim about this state's law."
qualification.residency = "1 years in the state immediately preceding filing"
```

What the player meets:

| start age | house                                                                                        | senate                  |
| --------- | -------------------------------------------------------------------------------------------- | ----------------------- |
| 18        | refused — "has not read this state's minimum age … will not put anyone under 21 on a ballot" | same                    |
| 21        | **eligible, no blocks**                                                                      | **eligible, no blocks** |
| 24        | eligible                                                                                     | eligible                |

**The drawn 23 is never applied.** A generic floor of 21 is what actually runs,
and its refusal sentence says the game has not read a minimum age for this
state — while a drawn minimum age sits in the pack beside it.

## The control

The same probe against Alaska, whose rules are sourced (`0200650`,
`us-ak-legislature-v1`):

| start age | house                                        | senate                                       |
| --------- | -------------------------------------------- | -------------------------------------------- |
| 18        | "younger than the sourced minimum age of 21" | "younger than the sourced minimum age of 25" |
| 21        | eligible                                     | "younger than the sourced minimum age of 25" |
| 24        | eligible                                     | "younger than the sourced minimum age of 25" |
| 40        | eligible                                     | eligible                                     |

Sourced values bind exactly. Drawn values do not bind at all. So this is not
"qualification never runs"; it is the generated half of the three-state rule
not being wired to the check.

## Why it is in the code

`candidacy.ts` consults `qualificationRules` (the sourced rule sets — Alaska
only today) and `qualificationAssessments` (the sourced corpus rows). The
generated pack's own `qualification` block is read by neither. The
`GAME_ADULT_CANDIDACY_AGE` floor at `candidacy.ts:420` then fires only when
`qualificationRules === null` and no sourced `MINIMUM_AGE` assessment exists —
which is every generated state.

## Why it matters more than the number

This branch's whole claim is three states a rule can be in, the middle one
being **generated from a realistic range and playable**. A drawn number that is
recorded, disclosed as drawn, and then not enforced is not that middle state.
It is the first state wearing the second one's label. The PR description says
"the drawn rule now fires only where a state has no compiled legislature at
all" — on this evidence it does not fire there either.

It is also the failure shape this project keeps paying for: an instrument that
reports a value while a different, weaker rule is what the player actually
meets. The honest part is that the refusal sentence does not fabricate law. The
dishonest part is that the record says 23 and the ballot says 21.

## What it is not

- **Not a Puerto Rico bug.** Puerto Rico is where it was found because Puerto
  Rico is seated with geography and no read law. Every generated state should
  show the same shape; that has not been measured here, and saying it has been
  would repeat the mistake this note is about.
- **Not main's.** On `d956b92a`, San Juan resolves to a place with
  `legislativeRulePackId: null`, `candidacyPackId: null` and no discovered
  offices at all. This branch is what gives Puerto Rico a government; it is
  also what gives it an unenforced one.
- **Not a claim about Puerto Rico's real law.** Its constitution has not been
  read into the corpus. Whatever it requires, the game is not reading it, and
  the fix is to make the drawn value bind — not to guess the real one.

## Measured afterwards: Maine, Georgia and Arizona

Asked whether the three states recorded in #342 as refusing outright — "the
game has not read this state's elected offices yet" — refuse for this same
reason. They do not. They refuse for the _opposite_ reason, and this branch is
what ends it.

On `main` at `d956b92a`, Portland ME (`2360545`), Atlanta GA (`1304000`) and
Phoenix AZ (`0455000`) each resolve to `legislativeRulePackId: null`,
`candidacyPackId: null` and `discoveredOfficeKeys: []` — nothing to stand for
at any age.

On this branch at `534c6646`, all three carry
`us-{me,ga,az}-legislature-profile-v1` with a house and a senate, and a
21-year-old is eligible with no blocks.

So the two defects are not one. The refusal is an absent pack; this note is
about a present pack whose numbers do not bind. **This branch fixes the first
and introduces the second.** A reader comparing the two should not collapse
them: the fix for the refusal is already here, and the fix for the unenforced
draw is not.

It does extend the claim this note refused to make earlier. Four generated
states now show the unenforced shape — PR, ME, GA, AZ — measured, not inferred.
That is four of forty-two, which is still not all of them.

## The half of his rule that must survive the fix

A drawn minimum age binding is the point. Borrowing a neighboring state's
rules never is. The 23 in Puerto Rico's pack is drawn from the national spread
that MN, MO, NJ and NV happen to span; it is not Minnesota's law, and nothing
in the fix may let a reader or the code confuse the two. The pack's note
already says so in words — `"Drawn from 21 to 24, the spread enacted by MN, MO,
NJ, NV. Not a claim about this state's law."` — and the enforcement path has to
carry the same distinction rather than quietly resolving a drawn value through
whatever sourced row it resembles.

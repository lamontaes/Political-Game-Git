# Four states whose generated veto override contradicted their constitution

Measured 2026-09-22 against the nationwide branch at head `a2378c2e`. Reported,
accepted and fixed the same night.

## What was happening

The nationwide work gives every state without a compiled legislature a generated
one, and draws its veto override threshold from the fractions that compiled
states actually use. That is the right design, and it is the project's own rule
for an unresearched jurisdiction: a realistic value drawn from the national
range, stable per state, rather than a refusal or an average.

Four of those states were not unresearched. Their constitutions had been read.
The draw did not know, so it drew anyway, and it was wrong in all four.

Measured by calling `legislatureProfileFor` directly on that branch:

| State          | What was generated                  | What the instrument says                                              |
| -------------- | ----------------------------------- | --------------------------------------------------------------------- |
| Tennessee      | two thirds of the members elected   | a majority of the membership entitled under the constitution          |
| North Carolina | two thirds of the members elected   | three fifths of those present and voting                              |
| Virginia       | three fifths of the members elected | two thirds of those present **and** a majority of the members elected |
| West Virginia  | two thirds of the members elected   | a majority of the members elected; two thirds for appropriations      |

Tennessee is the sharpest. A simple majority of the full membership is one of
the easiest override bars in the country, and the draw turned it into one of the
hardest. North Carolina's three fifths of those _present and voting_ is the
reason an override there is politically live at all; two thirds of the elected
membership is a different game.

D.C. was unaffected: `legislatureProfileFor("US-DC")` returns null, because the
District is handled separately.

## How it was fixed

The nationwide lane merged the readings branch rather than copying the file, so
there is one source for those numbers and no second copy to drift. The draw now
consults `VETO_OVERRIDE_SOURCE_READINGS` first and only draws where nothing has
been read. All four now carry the read value, citing their own instrument.
Texas and California, which nobody has read, still draw as they should.

## Two of the four still cannot be fully expressed

This is a declared gap, not a hidden one.

**Virginia's rule is two simultaneous conditions** — two thirds of those present
_and_ a majority of the members elected. An each-chamber override forum in this
schema carries one fraction against one denominator, so what ships is the
condition that maps. Virginia's override is therefore easier in play than the
constitution allows.

**West Virginia states a different bar per measure class** — a majority for an
ordinary bill, two thirds for appropriations. The schema carries no
per-measure-class threshold, so the ordinary bar ships and the appropriations
bar is recorded rather than applied.

Both are recorded in the pack's `unresolvedGaps` rather than flattened or
averaged. Flattening them would be the same failure as promoting a summary into
law. A schema change to hold both conditions is follow-up work.

## The general lesson

A generated value is only honest where nothing has been read. The moment a
reading exists anywhere in the repository, every generator has to consult it, or
the game states as fact something the project already knows to be false. That is
worse than the gap the generator was built to fill, because a refusal is
visible and a wrong number is not.

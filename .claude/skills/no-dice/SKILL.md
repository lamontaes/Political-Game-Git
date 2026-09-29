---
name: no-dice
description: >
  Use when writing or reviewing any decision a person, business, official or
  body makes in the simulation. The outcome must never come from a seeded
  random draw checked against a chance, or from a fixed percentage.
---

# No dice

A person's, business's, official's or body's decision comes from the actor's
traits, principles, relationships, money, health, the law currently in force
and the place's conditions — never from a seeded random draw checked against a
chance, and never from a fixed percentage. Aging and behavior are not linear
either: a trait or condition should compound and vary by actor, not tick at a
flat rate. Real rates (turnout by state, business failure rates, recidivism)
are checks on totals across many actors over time; they never become the
mechanism that decides one actor's one choice.

A value that only describes the starting world — a starting population, a
measured average with spread — may stay, but only marked with its real source.
See `estimate-not-unknown` for the marking convention.

## Check your own work

Before merging, grep the diff for `Math.random`, `seedrandom`, `rng(`, or any
`chance`/`probability`/`rollFor`-shaped variable feeding a branch on a
person/business/official/body decision. If one turns up, trace its inputs — if
the only inputs are a seed and a flat number, it is a roll and it fails this
rule, even when the number came from real research. Rewrite the branch as a
function of the actor's own traits, law, place and relationships instead. A
guard test should fail the build on a new roll of this shape; add one if the
change introduces a decision path that doesn't have one yet.

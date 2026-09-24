# Pushing the creator to its corners

**Run:** 2026-09-22 at `02a387f2`. A headless sweep of the character creator's
own accept/refuse rule (`newGameSetupProblems`) across every corner it offers,
then an enumeration of what each starting life can actually reach.

Asked for by lamontae: "you could have a save where you do a custom start and
then intentionally try to make the worst world possible… this is what I find
this good for, finding these interconnected systems that aren't as
interconnected as I thought."

## The first finding is about the creator itself

There is no lever to push. The whole custom start is: place, age (5–70), depth,
starting life, household, seed, names, gender, birthday. Nothing in it points a
world in a direction. A player who wants to make the worst world possible, or
to aim at a monarchy, has no dial to turn at the start — the ambition has to
live in how they play, and the creator has no opinion about it.

That is worth knowing before anyone designs a stress scenario around the
creator: the stress has to come from play.

## Corner sweep: 320 setups

Two places (one with a candidacy pack, one without) × ten ages spanning every
threshold (5, 17, 18, 20, 21, 24, 25, 40, 69, 70) × four starting lives × two
depths × two households.

**96 accepted, 224 refused.** Every refusal is a sentence a player can act on,
and there are only five distinct ones:

```
 80  Directing a state agency requires Custom Start, age 25 or older, beginning
     after the early years, and a place in a state whose personnel procedures
     the game has compiled.
 64  Judicial office practice requires Custom Start, age 25 or older, and
     beginning after the early years.
 40  The game has no legislative procedure for Lexington, Kentucky yet, so it
     cannot put a character to work in one there.
 40  The game has no legislative procedure for Cheyenne, Wyoming yet, so it
     cannot put a character to work in one there.
 32  A legislative office job needs a character of at least 21.
```

Nothing failed silently, nothing threw, and no refusal said "no" without
saying why. That is the fail-soft rule working, and it is the good news in
this record.

## What each starting life can reach

Sampled one real locality in each of the 51 states and D.C.:

| Starting life            | States it opens in          |
| ------------------------ | --------------------------- |
| Ordinary life            | **51 / 51**                 |
| Judicial office practice | **51 / 51**                 |
| State agency director    | **1 / 51** — Minnesota only |
| Legislative office       | **0 / 51**                  |

**Legislative office opens in no town in America.** Not in Frankfort, not in
Lincoln, not in Juneau, not in Columbus. Every one of the 35,582 places in the
national corpus carries `legislativeScenarioKey: null`, and the creator's rule
at `new-game.ts:302` refuses on exactly that field.

## Where it does open, and why that matters

Nine places carry a legislative scenario, and all nine are **a whole state**:

```
kentucky        Kentucky     -> kentucky
nebraska        Nebraska     -> nebraska
alaska          Alaska       -> alaska
state:US-MN     Minnesota    -> institution:us-mn-legislature-v1
state:US-IL     Illinois     -> institution:us-il-general-assembly-v1
state:US-MD     Maryland     -> institution:us-md-general-assembly-v1
state:US-MO     Missouri     -> institution:us-mo-general-assembly-v1
state:US-NV     Nevada       -> institution:us-nv-legislature-v1
state:US-OH     Ohio         -> institution:us-oh-general-assembly-v1
```

All nine accept a legislative start. So the route exists — but to take it a
player must say they are from _Illinois_, not from Chicago or Springfield.

This is the seam. Behind that start sits the drafting table: 20 program
families, 43 configurations, an as-offered versus as-you-would-file-it
comparison, the deepest system in the game
(`docs/playtest/how-big-is-the-game-2026-09-22.md`). It is reachable only by
declining to name a hometown, in nine states.

**Corrects an earlier note** that recorded this as "three of fifty-one places."
It is nine, and the distinction that matters is not the count but that every
one of them is state-scope. Naming a town closes the door.

## State agency director: one state

Minnesota, and nowhere else. The refusal names the reason honestly — the
game has compiled one state's personnel procedures — so this is a coverage
gap rather than a defect. Recorded because lamontae asked for the counts.

## What I would test next, in play rather than in the creator

- Start in Illinois (state-scope) and walk to the drafting table, to confirm
  the whole chain from that start to a filed bill still holds. The route is
  accepted by the creator; that is not the same as reachable on screen.
- The same start with a named hometown, to see what the player is told when
  the drafting table is absent. A door that is closed politely and a door that
  is not there read very differently.

## Method note

This sweep reads the creator's own accept/refuse rule, not a rendered screen.
It establishes what the rule permits. It does not establish that an accepted
setup produces a playable life, and it must not be read that way — a browser
walk is the instrument for that and it has not been run for these corners.

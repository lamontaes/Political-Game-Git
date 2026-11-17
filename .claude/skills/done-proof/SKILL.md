---
name: done-proof
description: >
  How done is proven (CTO, Nov 16, from the owner's rule "fix the cause, don't
  loosen the check"): what a pull request never adds without a CTO line, the
  screenshot from the running game, the feature map, three strikes, repeats
  that become checks, the verification stamp, and a one-line answer for each
  standing rule. Use before opening a pull request or marking one ready, and
  whenever loosening a red check looks easier than fixing it. Not for the
  second session's check (seen-in-game) or the gate's commands (train-gate,
  checker).
---

# How done is proven

The CTO's rules of Nov 16, posted on the crew's thread (issue #9747). They come from the Claude Code team's verification practice and the owner's standing rule, "fix the cause, don't loosen the check". They apply to every lane. Go through them before you open a pull request or mark one ready.

## 1. Never edit the checks that judge you

A pull request adds none of these unless a CTO line on the crew's thread approves that exact pull request:

- `it.fails`, `.skip`, `.only` or `todo`;
- a raised baseline or budget, or a widened tolerance;
- a test pinned to a named town or seed (a test draws its place: `drawn-place-tests`; an approved pin is written as `pinned-tests` says).

Ask for the line before you build on it: the pull request, the check, and why the fix cannot be at the cause. A guard will enforce this; it reads its rules from main, never from the pull request.

## 2. Done means seen in the running game

A screen or feature counts as done only when the pull request shows a screenshot from the game itself, reached by playing (dev mode allowed), next to its mock or the owner's words. A passing test alone is not done.

- Take the screenshot from a build of your own head, not from a mock page or a composed scene.
- Put the mock or the owner's quote beside it, and say how you reached the screen: the clicks, or the dev mode control.
- This is the builder's proof. After the merge, a second session still checks the item on main before it is `done` (`seen-in-game`).

## 3. The feature map

The Screens lane starts `docs/feature-map.md` (new). It has one row per screen and one per owner ruling about what the player sees. Each row gives how to reach it, what must show, and the check that proves it. Every pull request that touches a row runs that row's check and names it in the stamp. Until the map is on main, the stamp says so.

## 4. Three strikes

If a check still fails after three real attempts at the cause, stop. Post "for the CTO" on the crew's thread with the check, the place and seed, and what each attempt tried and found. A rerun is not an attempt. Never loosen the check to get past it.

## 5. No flaky tests

A flaky test is never skipped, slept or retried. Find the cause: replay the failed seed first (`drawn-place-tests`, "Before you call a red a flake"). Or delete the test and write down why in the pull request body.

## 6. Repeats become checks

Every complaint the owner has made twice gets a check that fails when the problem comes back. The ones named on Nov 16:

- boxes;
- empty space;
- scroll bars;
- the same title painting every game;
- a person shown before gender;
- the strip wider than its people;
- a stranger named with no context.

Each check ships in the pull request of its fix and fails on the old code: undo the fix once and watch it go red (`session-start`, step 2).

## 7. Fast checks and heavy checks

The Long game lane splits the checks first, and builds the rule-1 guard in the same pull request:

- A fast set runs on every push: build, typecheck, guards, and the tests for changed files.
- A heavy set runs on a schedule and before the CTO merges: the full suite and the 20-year drawn-place run.
- The full run must finish. Today it is canceled at 45 minutes.

Until that lands, run the gate your role's skill names (`train-gate`, `checker`).

## 8. Stamp it

Every pull request body says how it was verified. "none" is allowed, but it must be written.

```
Verified: <command>: <result>, where it ran, at <head sha>; ...
Feature map rows: <rows run> | none
Screenshot: <image>, beside <mock or the owner's words> | none (<why>)
CTO line: <link to the approving line> | none
```

## 9. The standing rules, one line each

Before a PR opens, answer each line below in the PR body in one sentence, or write "not touched". The rules with their own skill are listed at the end; use that skill instead. These lines record rulings and never make policy (AGENTS.md "Standing owner rules" has the owner's words).

1. **Sliding scales and causes.** Does anything flip at a threshold? Does a world event happen from a record (a hazard, a health record, a law, a price change) and not a monthly chance? Name the record.
2. **A game, not a spreadsheet (owner, Oct 14).** Does the change add a step to the player's life because real life has it? A mechanic exists only when the golden path needs it, The Political Process has it, or the owner asked for it by name. A real-world step the player would take is a question for the owner in the PR body, never a feature.
3. **Replace, never layer, and old material is deleted everywhere (owner, Oct 14 and Nov 14: "don't leave old shit in the files. Delete it. No need to keep a copy of everything.").** What did the PR delete? Not only code: banks, tests, docs, review pages and the shared project folder too. No "old", "superseded" or "-old" copy, no archive of what was replaced, no held copy; git keeps history. Say in the handoff what was deleted. (A line a ruling says will be built soon and that waits on a named pool item is work in hand, not old: the Account lead's reading, not the owner's words.) Old code, styles, data and markers go in the same change; the PR body counts them. Add the old path to the replaced list in `docs/current.json` and fix every pointer (`current-pointers`).
4. **One model, two tiers (owner, Oct 14).** A counted group is read by every engine with the same rule as a full person, times its count. A rule that applies only to full people is an unregistered placeholder. A term a counted voter's view needs goes on their stance profile (`countedStanceProfile`, read by `groupStance`), so every ballot, door and agreement path reads it with no change at the call sites; a kept ballot then keeps that term too, or its reasons stop matching its vote. A group's moved stance reaches a member filled in from it through the views engine's `onFillIn` (Nov 15, views thread).
5. **The chain is the acceptance (owner, Oct 14).** A bill, a budget line or an executive act is finished when one dollar or one rule is followed to a named person and back out, by record id: the record, the law in force changing, the payment or price, the person, the choice or view that moved, the director's scene or journal line.
6. **Owner decisions are flagged, never waited on (owner, Oct 14).** Build the simplest version that follows AGENTS.md, register a stopgap of kind `owner-decision`, and write the question under OWNER DECISIONS NEEDED in the PR body, after the reading line of `look-first`. English the owner can read: no office or tax jargon.
7. **American English everywhere.** `npm run spelling` lists what the guard would flag; `tests/guards/english/` enforces it.
8. **Every effect can be triggered from the game's own code in dev mode and its effect seen and traced there (owner, Nov 14: "every single one of those should be able to be triggered using the game code and advanced in order to see the effect").** Dev mode and advanced are the same thing. Traces a session makes by script or by reading code belong there too (`dev-tester`). **Link it to everything else (owner, Nov 16, 01:58Z: "you have to link it to everything else. This stuff can't exist independently. That goes for everything in this game."):** a record, view or screen that no other engine reads or shows is unfinished. For each effect the change adds (a law at town, county, state or country level, a budget line, an executive act, an event, a scene), name the dev mode control that causes it through the game's own calls and the Trace or "What came of it" line where its effect shows. A build that adds an effect dev mode cannot trigger and trace is not done: the missing control is part of the build, or its own pool item that this PR names under Waits on. "Could not reach it" in `seen-in-game` is a finding, never a pass.

### Rules with their own skill

`no-dice`, `one-rule-all-places`, `estimate-not-unknown`, `wire-to-the-world` (self-checks in `.agents/rules/standing-skills/`); `ask-why`, `look-first`, `day-one-in-motion`, `researcher`, `speed-work`, `scene-pictures`, `scene-standard`, `player-screen-text`, `seen-in-game`, `remove-a-stopgap`, `current-pointers`.

### Two more lines (Account lead, Nov 15)

- **Weights are not re-fit to make a behavior appear (Account lead, Nov 15), even when a citation is named.** Size things from the record, and bring the lead what is weighed against what. A cap or count set to what the world happens to give is a tuned number.
- **No count, span or flag stands in for a rule (Account lead, Nov 15).** A number of years, a count of rows or a boolean that approximates what a person, law or place would do is a stand-in; build the rule from the records that decide it, or register the stopgap naming the engine you could not find (`remove-a-stopgap`).

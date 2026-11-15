---
name: seen-in-game
description: >
  The acceptance rule for Our Civic Duty (owner's ruling, Nov 3, ruling 1;
  Fable audit, Nov 9, root cause 2): nothing is called done until a session
  that did not build it has seen it working in the running game, in a place
  and seed nobody chose, on main. Says what the second session does for each
  kind of work (a law or budget line, a scene, words, a screen, a simulation
  rule, a place fact, a speed change, a fix), how dev mode serves as the
  check, the traps that give a false pass, and how the result is recorded
  with `npm run pool -- seen`. Use when writing an item's Done when, before
  reporting anything as done, and when taking a merged item to check. Not for
  the builder's own proof (played-world-proof) or the merge gate (checker,
  merger).
---

# Seen in the game

**Look first:** run the `look-first` search before building, fixing, filing or asking; a found ruling is built and cited, never asked again.

## The rule

The ruling, as `OWNER-DECISIONS.md` records it (Nov 3, ruling 1): "Checkers never hold a merge; nothing is done until a second session replays its finish line on main; only confirmed work moves the number."

Why it exists: on Nov 9 the pool said done 1,926 times and 722 of its 3,096 items carried a send-back. A feature counted as finished when a record existed and its builder's own test passed. Nobody had to open the game and see it.

So there are three words, and they are not the same:

| Word   | Means                                                                                   | Who says it                                     |
| ------ | --------------------------------------------------------------------------------------- | ----------------------------------------------- |
| built  | The builder's own proof passes (`played-world-proof`) and the pull request is open.     | The builder                                     |
| merged | The work is on main. The pool item's status is `merged`. Later work may build on it.    | The merge (it flips the item by itself)         |
| done   | A second session saw it in the running game and recorded what it saw. Status is `done`. | The second session, with `npm run pool -- seen` |

A report to the owner counts only `done`. Write "merged, not yet seen" for the rest. Never write "works", "wired", "fixed" or "solved" for work nobody has seen in the game.

## Who checks, and with what

- **A different session from the one that built it**, on any model. A helper of the builder is the builder.
- **In the running game**: the bench (`npm run bench`, port 3000, play at `/play`), through the screens a player reaches and dev mode's controls. Never the builder's test, script, fixture or screenshot.
- **In a place and seed nobody chose.** Start a new game with the Place field empty, and write down the place and seed the title shows. Then run the item's named place and seed too, when it has one.
- **On main**, at the merge commit or later. Name the commit.
- **Read the item's Done when and do exactly that.** If the Done when cannot be done from the game, that is the finding: the item goes back to its writer.
- **Start the second session fresh, with the check as its own prompt.** One new session per check, told the pull request, the item, the steps and where to record what it saw. A message sent to a session that is already running arrives as another session's data, and that session waits for its own user before acting on it (Nov 10: a check sent to a finished second session was never run). Put the check on the item's own pull request as well (`docs/pool/START-A-BUILDER.md`: the pull request is the item's thread), so an agent on any tool can pick it up.

## What the second session does, by kind of work

| Kind of work                                                    | Do this in the running game                                                                                                                                                                                                                                                                                                               | It passes when                                                                                                                                                                                                          |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A law, budget line or executive act                             | Turn dev mode on. Open the bill's page, pick the body that has the power, set the margin, light "Chair hears it", press Hold the vote and Sign. Read "What came of it". Press "Run until it takes effect", run the item's days with dev mode's Run, then press "Follow the money". Pass the repeal the same way and read all three again. | The bill is law with no section added by a trade. "Who it reached" names people or counted people and dollars. The money moved the way the law implies, from the holders it should. The repeal puts the old value back. |
| A scene                                                         | Cause it from dev mode's scene list, or play to its cause. Take a screenshot of each beat. Open Trace on the scene.                                                                                                                                                                                                                       | The person it came to fits (age, office, where they live). Its lines are its own. A reply writes a record, and Trace shows another engine reading it.                                                                   |
| Words (bank lines, the news, speech)                            | Play a year with `node --import tsx scripts/dialogue-batch/scene-year.ts --seed <seed>` and a life in the browser (`scene-producers`). Read every line aloud.                                                                                                                                                                             | No line the owner rejected plays. No line breaks a writing rule. Nothing prints a code name, an id or a raw date.                                                                                                       |
| A screen                                                        | Open it in a drawn place at 1440 by 900 and take a screenshot. Put it beside the approved mock.                                                                                                                                                                                                                                           | Layout and content match the mock. Every figure on it equals the record Trace opens. Nothing withdrawn is still drawn.                                                                                                  |
| A simulation rule (jobs, money, moves)                          | Run the months the item names with dev mode's Run. Read the Metrics tab and "Follow the money" against the twin.                                                                                                                                                                                                                          | The cause on the records moves the result the way the rule says, and no figure is one a real place could not have (more jobs than adults, for one).                                                                     |
| A state or country change (the country tier, the monthly clock) | Start a game, run the months the item names with dev mode's Run (time skips with results first), then open the state's own results and the Metrics tab; read `docs/design/country-tier.md` for what the tier keeps. Compare against the twin.                                                                                             | The state's record moves from its cause (a law, a price, a disaster), the nation is the sum of the states, and the same change does nothing to a state it should not reach.                                             |
| A place fact                                                    | Start a game in a place of that state and one in another state. Open the Government and Elections screens.                                                                                                                                                                                                                                | The first place shows the right body and date. The second is unchanged.                                                                                                                                                 |
| Speed or memory                                                 | Run `npm run speed:year` on main, and dev mode's records proof against the commit before.                                                                                                                                                                                                                                                 | The year is inside the bar and the records are the same.                                                                                                                                                                |
| A fix                                                           | Replay the item's own steps in its place and seed, then in a drawn place.                                                                                                                                                                                                                                                                 | The defect is gone in both.                                                                                                                                                                                             |

Docs, skills and pool hygiene have nothing to see in the game. The CTO closes those by hand (`npm run pool -- status <id> done --by=cto`).

## Dev mode as the check

Turn it on from the game's options (the "On" button under dev mode). What each control proves:

- **The bill page's dev card.** Introduce, the margin, "Chair hears it", Hold the vote, Sign, Veto and Override go through the game's own calls. Under them, **What came of it** shows:
  - how the bill ended and why, from the legislature's own rows (`billEnding`): became law, held in committee by a named chair, lost in committee, lost on the floor, short of the votes to end debate (with the count needed), vetoed (with the override count), blocked, or the session ended;
  - **Sections added by a trade.** A forced bill should read 0. Above 0, the body traded a second section onto the bill and the run measures that rider too. Start over until it reads 0, or name the rider in your result;
  - each law row the bill made, whether it is in force yet, and **Who it reached**: records, full people in town and elsewhere, counted people, organizations, governments and dollars, by the engine that applied it (`lawReach` in `src/core2/law-reach/applied.ts`, the one reader). Zero records for a law that should act is a finding;
  - **Run until it takes effect**, which stops on that law row and no other.
- **Follow the money.** Builds the same world left alone (the twin), runs it to today, and lists cash in both by who holds it: your household, full people in town and elsewhere, counted households, businesses, banks, each government, and everything outside the books. Then it names the holders whose cash moved most. This is the check for "did the money go the right way, and out of the right pockets".
- **Run.** "Or until" stops on your own town, county, state and nation, and on your own people. Light "Anywhere in the world" only when another place's event is what you are testing.
- **Trace.** Any record id opens what caused it. Ask it about the record the Journal or the News names.

## Traps that give a false pass

- **A record is not an effect.** A reach row, a log entry or a table that "names the law" proves the paperwork. Follow the dollars or the changed choice to a named person.
- **A twin differs by process as well as by the law.** Any bill passing starts town halls and public comment (`dev-tester`). Judge the direction and size of the money, name who paid, and repeat in a second place before calling a law wrong or right.
- **Run with dev mode's Run, not Day and Week,** when you will press "Follow the money". The twin has nobody played, so anything the player did also shows as a difference.
- **Read the law after its own date.** A passed bill often takes effect the next July 1. Use "Run until it takes effect".
- **Check the starting law first.** If the law was already in force on day one, passing it changes nothing and proves nothing. Draw again.
- **Congress needs a wide margin.** The Senate needs three fifths to end debate; set the margin to 20 or more.
- **A place may lack the body.** A census-designated place has no council. Draw until the place has the body the item names, and list the places passed over.
- **One place is one place.** A result seen in one drawn place is true of that place. Say so, or repeat it.
- **Someone the player talks to is kept for good.** The game never sends the player's household, family or anyone the player knows back to the counts, nor officials, public workers, business owners and candidates. To watch a household go back, have the player look in on a workplace without talking to anyone (the staff are filled in and not known), run past the wait of 180 to 240 days and the next first of the month, and read those people with dev mode.
- **A change made on the first day can be taken as the starting point.** An engine that fits its opening on day one may absorb a law set that morning (Nov 10, Willow River, Minnesota: ending the income tax on day one moved the nation's unemployment a tenth of a point until the opening read the law of the day before). When a first-day change does almost nothing, repeat it after a month has run before calling the law weak, and report both.

- **"Could not reach it" is a finding, not a failed check.** When a second session cannot get the game to play the scene a change is about, in several drawn places and with dev mode staging the cause, the player cannot reach it either. Say what was tried, what did arrive (the records) and what never did (the scene), and the lead files the missing step as its own item. On Nov 11 a helper asked to show an office-hours reply found that a played official is never visited at all: the case records came and no resident did, while the change's own test reached a visit only by watching every official and calling the scene directly. A test that stages its own scene proves the scene's code, not that play reaches it.

## Recording what you saw

When it passes:

```
npm run pool -- seen <id> --by <your session's name> --place "<place>" --seed <seed> --main <commit> --saw "<what was on screen, in one sentence of eight words or more>"
```

That sets the item `done` and adds a "Seen in the game" line to its Notes. The builder's branch name cannot be the `--by`.

When it fails:

```
npm run pool -- seen <id> --not --by <name> --place "<place>" --seed <seed> --main <commit> --saw "<what you saw instead>"
```

That reopens the item with the reason in Notes, so the next builder reads it.

Either way, comment once on the pull request, starting "Seen:" or "Not seen:", with the place, seed, commit, the steps you took and what each screen showed. Screenshots do not render from a session's comment, so commit them under `docs/seen/<item id>/` with a README naming the place and seed, and give the path.

## Writing a Done when a second session can run

Every item at the standard says "second session" in its Done when (`.agents/rules/pool-item-standard.md`; `npm run pool -- --check` enforces it).

- Name the screen and how to reach it, the control to press, and what must be on screen after: a number, a name, a line.
- Say "a drawn place" and, if the defect was measured somewhere, that place and seed as a named repro.
- Where money is involved, ask for "Follow the money" and say which holders must and must not move.
- Never ask for "a record exists" or "the test passes" alone.
- Open the screen yourself before you write its steps. On Nov 10 two checks named a "Laws panel" that does not exist and asked for a state row where the table has state columns; the second session had to say what it used instead.
- Do the whole check yourself once before you hand it over, in a played world, and write the steps from what you did. On Nov 10 a check asked a second session to meet a neighbor and watch them go back to the counts after 240 days. It could not happen: a person the player talks to joins the player's circle, and the circle is kept as full people on purpose. The check came back "not seen" for a fix that worked.
- **An item whose pull request merged but that still says `in-pr` or `claimed` cannot be recorded, and a second session does not wait on it (Nov 11).** `pool seen` refuses anything that is not `merged`, and the command that flips an item pushes to main, which a second session may not do. Tell the orchestrator and go on to the next group. The orchestrator flips the item in a pool-only pull request with `npm run pool -- status <id> merged --pr <n> --no-push` (every pool command takes `--no-push`); on Nov 11 a second session sat in a loop for an hour over five such items.

## When `seen` says "claimed, not merged"

`npm run pool -- seen` takes only an item whose status is `merged`. An item whose fix merged long ago can still read `claimed` or `open` when its PR line 1 was not `Pool item: <id>` or its claim never flipped (a replay item that `next` hands you is one). Before you replay it, read the pull request the item names (`pr:`) and confirm it merged. If it did, set the item to merged with `npm run pool -- status <id> merged --pr <n>`, then run `seen`. If it did not merge, do not set it: release the item with the reason. Do the replay before you record it, and name the places and seeds in `--place` and `--seed` (Nov 11: `elections-past-race-votes-from-electorate`, replayed in three drawn places).

## Stop condition

The check is finished when the pool item is `done` with its "Seen in the game" line, or reopened with its "Not seen in the game" line, and the pull request carries the comment.

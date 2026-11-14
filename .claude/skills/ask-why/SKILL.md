---
name: ask-why
description: >
  Checks a report or proof for odd numbers and patterns and names each one's
  cause by file and line, or "not found". Use before sending any report,
  proof or PR body that quotes results.
---

# Ask why

**Look first (owner, Oct 27):** run `look-first` before building, fixing, filing or asking; a found ruling is built and cited, never asked again.

Run this checklist over every result before it goes out. Each hit needs a cause, or it is a defect you file.

## The checklist

- A lopsided total (5 to 0, 90% one side).
- A constant repeated across races or worlds.
- A date shared across worlds.
- A tiny or huge balance.
- A seat left empty.
- A body that never met.
- A race not held.
- An office that did nothing.
- A person with no job and $0.
- Four or more game weeks with no scene for the player.
- A stop with no scene (a routine shift, a label that doesn't match what happened).
- A player's bill, filing or request that never reaches a vote, a decision or a reply.
- A repeated pattern across places.

## Find the cause

1. Grep the module that writes it: `grep -rn "<kind or field>" src/core2 src/rules src/director`.
2. Read the parameter: `src/core2/data/` and the parameter table. Note whether it is SOURCED, ESTIMATED or TUNABLE.
3. For a shared date or constant, find the schedule or literal: `grep -rn "<the value>" src data`.
4. For a lopsided total, find the argmax or sort that picks the winner, and what feeds it (traits, money, law in force).
5. For an empty seat, a missed meeting or an unheld race, find the function that should have created it and the condition that skipped it.
6. For a person with no job and $0, read the record the person was filled in from, then the job and ledger writers.

## Rules

- Name the cause with `file:line` and a sentence on what the code does. If you cannot find it, write "not found". Never guess.
- Mark each claim measured or inferred.
- A cause that is a seeded roll or fixed percentage deciding one actor's outcome breaks `no-dice`.
- Nobody attributes a change to a law unless they learned of it; cite the source (news, conversation, notice).
- Put findings on the item's own pull request (owner, Nov 10: the pull request is the item's thread, `docs/pool/START-A-BUILDER.md`), or in the job's report. A line for the whole crew goes in the leads channel (`docs/coordination/LEADS-2026-10-24.md`). Write in plain American English per `civic-reports` and run `npm run report:check -- <file>` on any file you send.
- A rate or share has the same people in its numerator and denominator. The Nov 14 "too many deaths" count put about 6,200 officials kept as outside records in the top and none in the bottom; once both counted one population the rate matched the game's own table.

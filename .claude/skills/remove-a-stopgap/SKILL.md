---
name: remove-a-stopgap
description: >
  How to replace and unregister a stopgap row in Our Civic Duty: read the
  register and the code first, look for open PRs and existing engines to
  build on, add no new stopgap, and mark a row resolved only when the
  replacement is real and the marker is gone. Use when a thread's job is to
  clear a stopgap, when a PR says it resolves one, and when you read a
  "resolved" row. Not for registering a new one (session-start) or for turning
  a number into a sourced one (researcher).
---

# Remove a stopgap

A row lives in a family file under `src/core2/data/stopgaps/` (the director's in `src/director/data/stopgaps.json`) and a `stopgap("SG-...")` marker or `stopgapId:` comment in code. An unregistered id throws, and a release is refused while a row is open.

## Order of work

1. **Read what the row fakes** and the code at its marker. Check whether it still does (rows go stale).
2. **Look for something to build on** before writing anything: `look-first`, open PRs that touch the same files (`mcp__github__list_pull_requests`, the train branch), the engine that already owns the mechanic (AGENTS.md rule 0: every system is already built; wire through it).
3. **Build the replacement through that engine.** No new stopgap, no new tracking system. If something cannot be done, say what is missing in the PR; do not swap one stand-in for another.
4. **Unregister only when the replacement is real:** delete the marker and set the row `resolved` with the replacement named. Count what was removed in the PR body.
5. **Prove it in a played world** (`played-world-proof`): another engine reads the new record, named by id.

## Traps

- "Resolved" does not mean removed. About 378 rows were closed Nov 10 as "dropped: too in depth" while the estimate still runs, and 176 of them still have a live marker. Reading a resolved row, check the code.
- A stand-in row with no player effect and no data is dropped without asking. One a player can see stays until replaced.
- A design call about the player's own experience is an `owner-decision` row plus a decision card, never a wait.

## No new stopgaps (owner's rule, Nov 14)

This overrides any older note, item or skill line that says a builder may leave or register a new stopgap. Build the real thing through the engine that exists, or say in the PR what is missing and stop.

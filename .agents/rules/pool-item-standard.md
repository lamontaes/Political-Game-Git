# The pool item standard (owner, Nov 10, 2026)

Owner, Nov 10: every assignment works without Fable, and "I don't want any work to be done unless Fable found the fix." An item at the standard says enough that whichever model picks it up can build it from the item alone. The file format and an example are in `docs/pool/README.md`; `npm run pool -- --check` enforces this rule on every item that carries `standard: 2` and names each thing missing. An item without `standard: 2` is from before the standard and is being redone; the check judges it as it always did.

## Fields

Beyond the usual ones, an item at the standard carries:

- `standard: 2`.
- `model:` one of `haiku`, `sonnet`, `opus`, `fable`: the least capable model that can build it from the item alone.
- `effort:` one of `low`, `medium`, `high`.
- `root:` the design or root cause it belongs to, an id from `docs/pool/roots.md`, or `none`.
- `lead:` the role that owns it. Required.
- `after:` and `blocked-on:`, present (they may be empty).

## Sections, in this order

**What.**, **Cause.**, **Fix.**, **Time box.**, **Rules.**, **Done when.**, **Waits on.**, **Files.** Notes may follow.

- **What** ends with one sentence that says where the player sees or feels the result (owner, Nov 10, 2026). It begins `Seen:` and names the screen, scene, line, number or choice ("Seen: the bill card's line for who the law reached, in dollars."); or `Feeds:` followed by the id of the item it is a step toward, which must itself say where it is seen; or, for a rule, a check, a skill or a pool tool, `Guards:` and the thing the player sees or feels that it keeps working ("Guards: the Journal opens with no developer text", "Guards: the pool hands builders what the owner asked for first"). A guard that protects only another unseen piece is the same as an item seen nowhere, so it is not filed. The check cannot judge that: it only requires at least four words after `Seen:` and `Guards:`, and the lead reads the line. The check enforces it on every open, claimed, blocked or in-PR item; an item whose `checked:` is `fable 2026-11-10` is let through until the depth sweep reaches it.
- **Time box** names a number of hours.
- **Done when** says what a second session sees in the running game, in a drawn place, and contains the words "second session".
- **Waits on** is `Nothing.` or the items or rulings it waits for.
- **Files**: every path exists, unless it is followed by ` (new)`.

## The depth test

Owner, Nov 10, 2026: "Asking an office for public records, that's way too in depth. Way, way, way too in depth. And that's the kind of stuff that work is being wasted on." An item the player sees nowhere, and no ruling asks for, is not filed. The sweep of existing items is `docs/pool/DEPTH-SWEEP.md`.

## The four kinds of cause

**Cause.** begins with exactly one of these:

- `Found in code:` then at least one repository path that exists, with a line number or a function name.
- `Measured:` then a place and a seed, or the command that shows it.
- `Design:` for work that is new, not broken: then a path under `docs/` that exists, or a dated owner ruling.
- `Needs cause.` nothing is known yet; say what was looked at.

**Fix.** says what to change in plain words. For `Needs cause.` it reads `None until the cause is found.`

## A `Needs cause.` item is not built

`npm run pool -- claim` refuses it with that reason. The index lists it under "Needs cause" and keeps it out of Next up. Any session that finds the cause rewrites the item with `Found in code:` or `Measured:` and a real Fix; finding a cause is itself work an item may ask for (its `model:` says who can).

## Which model and effort

- `haiku`: finding and listing (a search, a count, an inventory with no judgment in it).
- `sonnet`: a scoped build against a written fix, with its test.
- `opus`: a build that needs a design choice inside one engine, or finding a cause inside one engine. A cause an Opus session finds is checked by a second session before anything is built on it.
- `fable`: a design across engines that no written fix covers yet. Such an item is split until only the design step itself needs it (owner, Nov 10: every assignment works without Fable).

Effort is proportional to the task: `low` for a mechanical change, `medium` for a normal build, `high` for a fix whose cause took a design read to see.

## Adding and auditing

`npm run pool -- add` writes `standard: 2` and requires `--cause`, `--fix`, `--timebox`, `--model`, `--effort`, `--root`, `--lead` and `--waits` beside the body flags; it lists what is missing and refuses. `npm run pool -- audit [--out <file>]` reads every open, gated and blocked item and writes one JSON row each (whether at the standard, what it lacks, the paths and names it cites that no longer exist, lead, size, last change); it changes nothing.

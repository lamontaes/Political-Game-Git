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

- **Time box** names a number of hours.
- **Done when** says what a second session sees in the running game, in a drawn place, and contains the words "second session".
- **Waits on** is `Nothing.` or the items or rulings it waits for.
- **Files**: every path exists, unless it is followed by ` (new)`.

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
- `opus`: a build that needs a design choice inside one engine.
- `fable`: work across engines, or finding a root cause.

Effort is proportional to the task: `low` for a mechanical change, `medium` for a normal build, `high` for a fix whose cause took a design read to see.

## Adding and auditing

`npm run pool -- add` writes `standard: 2` and requires `--cause`, `--fix`, `--timebox`, `--model`, `--effort`, `--root`, `--lead` and `--waits` beside the body flags; it lists what is missing and refuses. `npm run pool -- audit [--out <file>]` reads every open, gated and blocked item and writes one JSON row each (whether at the standard, what it lacks, the paths and names it cites that no longer exist, lead, size, last change); it changes nothing.

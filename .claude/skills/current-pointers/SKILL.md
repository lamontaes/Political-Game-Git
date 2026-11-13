---
name: current-pointers
description: >
  How Our Civic Duty keeps one place that says what is current
  (`docs/current.json`, read as `docs/CURRENT.md`) and keeps every document,
  rule, skill and code comment pointing at paths that exist (owner, Nov 11).
  Use whenever you move, rename, replace or delete a file or folder, add
  something at the top of the repository, clean pointers out of an area, or
  see `tests/guards/current-pointers.test.ts` fail. Not for what may be
  deleted (slim-down), and not for the owner's rulings and other records,
  which keep what was said and are never rewritten.
---

# Current pointers

Owner, Nov 11, 2026: "updates all documents so that nothing is pointing at
anything old, and have somewhere as like a master updater or something, to
where in the future old things aren't pointing at all different things at all
different times."

## The one place

- **`docs/current.json` is the master file.** It holds four lists:
  - `current`: the current thing for each kind (the guide, the rulings log, each engine, each screen kit, each bank, each check).
  - `topLevel`: one row for everything at the top of the repository, with what it is.
  - `records`: the files that keep what was said or shipped. They are never rewritten, and the guard does not read them.
  - `replaced`: every path that was replaced or removed, what stands in its place, when and why. A row stays forever.
- **`docs/CURRENT.md` is the same thing as a page.** It is written by `node --import tsx scripts/current/write.ts`. Change the JSON, then run the command; never edit the page.
- **The guard is `tests/guards/current-pointers.test.ts`.** The scanner behind it is `scripts/current/pointers.ts`.

## When you replace, move or remove something

Do all of this in the same pull request as the change:

1. **Add a `replaced` row:** `old` (the path that is gone), `now` (the path that stands in its place, or the commit to restore it from when nothing does), `when` and `why` in one plain sentence.
2. **Change the `current` row** when the thing you replaced was the current one of its kind.
3. **Fix every pointer to the old path.**
   - **Removed, with nothing in its place:** run `node --import tsx scripts/current/repoint.ts`. It marks every pointer to it with " (removed)" after the path, in documents and in code comments. The guard does not count a marked pointer when the replaced list covers the path, and still counts one the list does not cover.
   - **Moved or replaced by something:** search for it with `git grep -n "<old path>"` and change each by hand. The tool leaves these alone on purpose: a sentence may be sending a reader to the file, or talking about the old one, and only a person can tell which.
   - Leave the records alone.
4. **Run the writer and the guard:**
   - `node --import tsx scripts/current/write.ts`
   - `npx vitest run tests/guards/current-pointers.test.ts`

## When you add something at the top of the repository

Add a `topLevel` row that says what it is. Think first whether it belongs inside a folder that exists; a new top-level folder is rare.

## What the guard reads

- **Every tracked Markdown file,** and the comments of TypeScript and JavaScript files under `src`, `scripts` and `tests`.
- **A pointer is a path in backticks** that starts with one of the repository's own top folders. In a code comment a bare path with a file extension counts too.
- **Not a pointer:** a path with a placeholder in it (`<id>`, `*`, `{name}`), and a path followed by " (new)", which is a file an item will create. A path followed by " (removed)" is not one either, when the replaced list covers it.

## The count that only goes down

- **`tests/guards/current-pointers-baseline.json` counts, by area, the pointers that named nothing when the guard was written** (5,285 on Nov 11). An area's count may go down and never up; an area with no row may hold none.
- **To see an area's dead pointers:** `node --import tsx scripts/current/pointers.ts | grep "^docs/pool:"`.
- **After you fix or remove some,** lower the counts with `node --import tsx scripts/current/pointers.ts --write`. The guard fails until you do, so a fixed area cannot slip back.
- **Never run `--write` to make room for a new dead pointer.** Fix the pointer.

## Traps

- **A path in a test's string is not read; a path in its comment is.** Keep comments true.
- **An item that will create a file** writes the path as `` `path/to/file.ts` (new) ``.
- **A file whose name has spaces or special characters** is listed by git in quotes unless you ask for `-z`; the scanner does.
- **Deleting a folder of old reports lowers its own area's count and can leave pointers to it elsewhere.** Search the whole repository for the folder's name before you open the pull request.
- **A pull request written before a rule can break it on main.** The strip's pull request deleted five files and merged an hour after this guard did; four old documents still named them, and main went red. Whoever deletes a file runs the guard on main merged in, the same hour.

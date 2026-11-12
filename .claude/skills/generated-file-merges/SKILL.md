---
name: generated-file-merges
description: >
  How to merge main into a branch when the conflict is in a file a command
  writes (the pulled-lines file, the pool index, coverage and counts files) or
  in a bank or rules file keyed by piece or rule id, without hand-editing
  conflict markers or dropping the other side's rows. Use whenever a merge of
  main stops on data/english, docs/pool/INDEX.md or another generated file,
  and when several pull requests touch the same rules file in a row. Not for
  conflicts in code (pr-fixer) or for deciding the order pull requests merge
  in (merger).
---

# Merging files a command writes

Some files are written by a command from other files. Two branches that each ran the command will always conflict in them, and the conflict means nothing: the right content is whatever the command writes from the merged inputs.

## The rule

**Never resolve a generated file by hand. Take either side, then run the command that writes it.**

1. `git merge origin/main` (a plain merge; never rebase, never force-push).
2. For each conflicted generated file: `git checkout --theirs <file>` (main's copy), so the tree is whole.
3. Resolve the real conflicts in the inputs, if any (see "Keyed files" below).
4. Run the writer, twice. The second run must change no file; if it does, the writer is not stable and that is a defect to report.
5. Run the tests that read the file, then commit the merge.

## Which command writes which file

| File                                              | Written by                                                                                               |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `data/english/pulled.json`                        | `npm run words:rules`                                                                                    |
| `data/english/coverage.json` and the rules report | `npm run words:rules`                                                                                    |
| `docs/pool/INDEX.md`                              | `npm run pool`, on main only: a branch never commits it, so take main's copy and leave it                |
| `data/english/judged/<rule>.json`                 | `npm run words:verdicts -- --from <folder>`; without `--from` it only drops verdicts whose lines changed |

Check a file's header or the script in `package.json` before assuming a file is generated; a hand-kept file resolved this way loses work.

## Keyed files: rules, banks, stopgaps, parameters

`data/english/line-rules.json`, the bank files under `data/english/parts/`, the stopgap family files and the parameter tables are lists of rows with a key. Two branches that each added or changed rows conflict by position, not by meaning.

- **Keep both sides' rows.** A row main added stays, a row the branch added stays. Compare by key, not by line.
- **The same key changed on both sides is a real conflict.** Read both and keep the newer ruling; if you cannot tell, ask the row's owner on the pull request.
- **Bank lines are Story's (owner, Nov 10).** Re-adding a piece that exists on one side, by its key and word for word, is mechanical and allowed. Writing, rewording or dropping a line is not: leave it and say so on the pull request.
- After merging a rules or bank file, run `npm run words:rules` twice and the English guards (`npx vitest run tests/guards/english`).

## Several pull requests on one rules file

On Nov 10 five pull requests each changed `data/english/line-rules.json`. They merged cleanly one after another because each was brought up to main only after the one before it landed.

- Say the order on the crew thread when you open them, smallest first.
- Merge main into the next one only when the one before it is on main. Doing all of them at once just moves the conflict.
- After each merge-up, post the new head and the counted result (for the rules file: how many rules still have no test, from the file, not from arithmetic).

## A stack that merged from the bottom

When the bottom pull request of a stack is squash-merged, every branch above it conflicts with main in the files the bottom one changed. If nothing else on main touched those files since the upper branch last merged the lower one, the upper branch's copy is the right one for every such hunk (`git checkout --ours <file>`), because it already holds the lower one's last commit. Check both facts with `git log` before you rely on it. The CTO's rule (Nov 10) avoids the problem: a stack gated as one tree merges from its top, and the lower pull requests close as contained.

## Two traps after a merge

- **A merge that deletes or renames a file a report or doc cites raises the pointer baseline.** `tests/guards/current-pointers.test.ts` then fails. Fix the citing line, or add the old path to the `replaced` list in `docs/current.json` (skill `current-pointers`). Never raise `tests/guards/current-pointers-baseline.json` to make room: that count may only fall.
- **`git add -A` inside a sparse helper copy is safe.** It stages only what the copy holds; the image files the copy skips are not read as deleted (checked Nov 12: 6,236 skipped paths, 0 staged). Only pictures you add or move need `git add --sparse` (skill `helper-checkout`).

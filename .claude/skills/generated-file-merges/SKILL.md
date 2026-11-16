---
name: generated-file-merges
description: >
  How to merge dev into a branch when the conflict is in a file a command
  writes (the pulled-lines file, the pool index, coverage and counts files) or
  in a bank or rules file keyed by piece or rule id, without hand-editing
  conflict markers or dropping the other side's rows. Use whenever a merge of
  dev stops on data/english, docs/pool/INDEX.md or another generated file,
  and when several pull requests touch the same rules file in a row. Not for
  conflicts in code (pr-fixer) or for deciding the order pull requests merge
  in (merger).
---

# Merging files a command writes

Some files are written by a command from other files. Two branches that each ran the command will always conflict in them, and the conflict means nothing: the right content is whatever the command writes from the merged inputs.

## The rule

**Never resolve a generated file by hand. Take either side, then run the command that writes it.**

1. `git merge origin/dev` (a plain merge; never rebase, never force-push).
   Never merge `main` into a branch: it holds the game without tests, and merging it deletes them; merge `dev`. A guard (`scripts/promote/no-promote-in-history.mjs`) fails a branch that has it.
2. For each conflicted generated file: `git checkout --theirs <file>` (dev's copy), so the tree is whole.
3. Resolve the real conflicts in the inputs, if any (see "Keyed files" below).
4. Run the writer, twice. The second run must change no file; if it does, the writer is not stable and that is a defect to report.
5. Run the tests that read the file, then commit the merge.

## Which command writes which file

| File                                              | Written by                                                                                               |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `data/english/pulled.json`                        | `npm run words:rules`                                                                                    |
| `data/english/coverage.json` and the rules report | `npm run words:rules`                                                                                    |
| `docs/pool/INDEX.md`                              | `npm run pool`, on dev only: a branch never commits it, so take dev's copy and leave it                  |
| `data/english/judged/<rule>.json`                 | `npm run words:verdicts -- --from <folder>`; without `--from` it only drops verdicts whose lines changed |

Check a file's header or the script in `package.json` before assuming a file is generated; a hand-kept file resolved this way loses work.

## Keyed files: rules, banks, stopgaps, parameters

`data/english/line-rules.json`, the bank files under `data/english/parts/`, the stopgap family files and the parameter tables are lists of rows with a key. Two branches that each added or changed rows conflict by position, not by meaning.

- **Keep both sides' rows.** A row dev added stays, a row the branch added stays. Compare by key, not by line.
- **The same key changed on both sides is a real conflict.** Read both and keep the newer ruling; if you cannot tell, ask the row's owner on the pull request.
- **Bank lines are Story's (owner, Nov 10).** Re-adding a piece that exists on one side, by its key and word for word, is mechanical and allowed. Writing, rewording or dropping a line is not: leave it and say so on the pull request.
- After merging a rules or bank file, run `npm run words:rules` twice and the English guards (`npx vitest run tests/guards/english`).
- **A bank file has two keyed parts: `parts` by `key` and `slots` by slot name.** Merge both three ways from the index stages (`git show :1:<file>`, `:2:`, `:3:`): take the side that changed from the base, keep rows either side added. Taking one side's top level whole drops the other's new slots (S6, Nov 15: the train added 11 slots a branch's copy lacked). The judged stores beside it merge by union: the `.yes.txt` lists line by line (`sort -u`), the `.json` "no" maps key by key; `pulled.json` is written by the commands, so take the train's copy; then `npm run words:verdicts` and `npm run words:rules` twice.
- **Merging without a hand edit (account lead, Nov 15).** For `data/english/parts/scene-talk.json`, read the three index stages (`git show :1:<file>` base, `:2:` yours, `:3:` theirs), go through `parts` by `key`, and take the side that changed from the base (both changed is the real conflict above); a key one side deleted and the other left alone stays deleted. For a judged store, start from theirs, add every entry of your `no` dict that theirs lacks, and write the union of both `.yes.txt` lists; a `.yes.txt` git merged on its own has no stages, so read it from the working tree. Then `npm run words:verdicts` (no `--from`) and `npm run words:rules` twice. Afterwards count what each side lost: `comm -23 <(git show <their head>:<store>.yes.txt | sort) <(sort <store>.yes.txt)`. What theirs lost should be only lines your branch changed or deleted; anything else means the union went wrong.

## Several pull requests on one rules file

On Nov 10 five pull requests each changed `data/english/line-rules.json`. They merged cleanly one after another because each was brought up to dev only after the one before it landed.

- Say the order on the crew thread when you open them, smallest first.
- Merge dev into the next one only when the one before it is on dev. Doing all of them at once just moves the conflict.
- After each merge-up, post the new head and the counted result (for the rules file: how many rules still have no test, from the file, not from arithmetic).

## A stack that merged from the bottom

When the bottom pull request of a stack is squash-merged, every branch above it conflicts with dev in the files the bottom one changed. If nothing else on dev touched those files since the upper branch last merged the lower one, the upper branch's copy is the right one for every such hunk (`git checkout --ours <file>`), because it already holds the lower one's last commit. Check both facts with `git log` before you rely on it. The CTO's rule (Nov 10) avoids the problem: a stack gated as one tree merges from its top, and the lower pull requests close as contained.

## Two traps after a merge

- **A merge that deletes or renames a file a report or doc cites raises the pointer baseline.** `tests/guards/current-pointers.test.ts` then fails. Fix the citing line, or add the old path to the `replaced` list in `docs/current.json` (skill `current-pointers`). Never raise `tests/guards/current-pointers-baseline.json` to make room: that count may only fall.
- **`git add -A` inside a sparse helper copy is safe.** It stages only what the copy holds; the image files the copy skips are not read as deleted (checked Nov 12: 6,236 skipped paths, 0 staged). Only pictures you add or move need `git add --sparse` (skill `helper-checkout`).

## Merging the train into a branch that carries a feature the train removed (Nov 15, Visit/Call thread)

Git auto-merges the train's removal hunks silently in files with no conflict (the Visit/Call card lost its lines in `places.ts`, `shift.ts`, `player.ts`, `/api/known` and `personCardNode` in `play.mjs` this way). After such a merge, diff each card file against the feature branch's head and reapply what was dropped: `git diff <removal-commit> <removal-commit>^ -- <files> | git apply --3way` restores it, and typecheck catches the rest. After a train merge, also count a bank file's part keys against the pre-merge file (a merge once dropped 114 lines silently).

## Folding many branches into one train (Nov 14, the Account lead's train)

The train branch takes finished pull requests one named sha at a time, sometimes forty in a night. The merge is a plain `git merge <sha>`; what goes wrong is always in the bank and verdict files. What worked and what bit:

- **Union bank files by key, three ways (base, ours, theirs), and make the tool fail loudly.** A part is the same part when its key matches. Take the other side's added keys, apply its changes and removals, and stop on any key both sides changed. A script that printed a same-key conflict but exited 0 let a fold carry on with the train's side and silently drop a whole pull request's lines; the fold looked clean. Any non-zero exit from the union aborts the fold.
- **Collapse same-key, same-text duplicates before diffing** (one part, uses joined). The banks test forbids two parts with one key.
- **After every fold, audit by key against the named sha:** parts added, slots added, uses, and what was removed. A removal is allowed only when the pull request itself deleted it against the common base (a carried rewrite can delete hundreds of lines on purpose); check that with the base, ours and theirs key sets, not by the count.
- **Judged stores: union the verdicts, then check no `.yes.txt` shrank.** The union can empty a store the pull request never touched; recover it from the train's copy joined with the sha's copy, then write it with the store's own writer. `npm run words:verdicts` then drops verdicts about lines no longer in the bank, so a good count falls by exactly the lines a pull request removed, and says so.
- **Conflicted generated files (`pulled.json`, the line-inserts baseline): take ours, `git add` it, run `npm run words:rules` twice.** An unmerged path left behind makes the commit fail and every later fold in the same loop fail with it.
- **The line-inserts baseline only goes down.** When the guard says lower N to M, lower the bank and `total` by the same amount in the next push.
- **Send a pull request back, never settle it, when the conflict is code, a director data file or a pool item** (`src/director/purpose-scene.ts`, `purpose-arcs.json`, `stopgaps.json`, a shared pool item); comment on the crew issue with the file and the train head to merge in. A mod-mod conflict on the same bank key goes back too.
- **Gate every push on what changed since the last push:** typecheck, the guards, release check, zero-dice, eslint on changed `.ts` and `.mjs` files (the repository check in CI fails on lint even when typecheck passes; an empty file list lints the whole repository, so guard it), and the changed test files by name. Put the commands in a script file; `$(...)` inside a quoted `bash -c` string expands wrong.
- **A new test in one pull request can turn another fold red.** A test that reads the whole world (law reach, most specific line) finds a regression from a different fold; name the failing call chain in the report and the fold that added the call, and do not revert it yourself.
- **Run a long test file alone before calling a timeout real.** A test that passes alone in 40 seconds and fails at its limit while the gate runs other suites is a limit too close to its run time; tell its builder.
- **In a criss-cross merge the merge base can hold conflict markers.** When `git show :1:<bank>` has `<<<<<<<` lines, the three-way bank merge has no clean base; use your own earlier merge of the other side (the last commit where you settled the same bank) as the base instead, then run `words:verdicts` and `words:rules` twice (Nov 15, S6 on #9324).

## Two skills appended by two branches (Nov 15, S3)

- When two branches both append to the same skill, keep both sides in both mirrors (`.agents` and `.claude`) with one script and run `npm run test:skill-ops`.
- A leftover "cherry-pick in progress" state is cleared with `git cherry-pick --quit`.

## Lessons of Nov 15, 07:00Z (rule 113 onto the Train)

- **A judged store is two files; union both.** A store is `<rule>.json` (the bad verdicts, the count and the good list's hash) and `<rule>.yes.txt` (the good list). When you combine both sides of a merge, copy both files from each side for every store either side changed, not only the files git marked as conflicted. Reading the `.json` without its `.yes.txt` gives an empty good list. On Nov 15, two stores lost 310 and 481 good verdicts that way, and only the guard "a judged rule with saved verdicts has some judged good" caught it. `readStore` and `writeStore` in `scripts/words/verdicts.ts` take a directory. Look a store up by `storeName(rule)`, not by the rule id (`reply-follows` is the store of `reply-follows-the-line-before`).
- **The same line placed twice under one rule is not a both-sides keep.** When both sides added the same `excludesFacts` to the same line for the same reason (one `acted`, one `vote-held`), keep the placement the Words lead ruled on and delete the other. One rule lives in one place. File any case the kept placement misses as a pool item against the pull request that owns the rule.
- **Verdicts dropped after a merge can be right.** When a merge changes where lines play, the pair sets change, and `words:verdicts` drops the verdicts about pairs that no longer occur. Check that the Train alone drops none (`npm run words:verdicts` on a detached copy of the Train's head). Then the drops come from the merge's placement, not from a lost line.

---
id: pool-next-release-note-id-already-used
title: "The pool command starts an item's branch with a release note whose id may already be used, which turns a release test red"
area: docs
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: cto
model: sonnet
effort: low
root: rc2-done-from-records
source: found by Fable on Nov 10 while fixing a release test red on main (pull request #8228)
checked: fable 2026-11-10
---

**What.** `npm run pool -- next` starts each item's branch with a release note named after the item. An item that already had a merged pull request (a sent-back or reopened item) has that id recorded as released, so the note's id is refused and the release test "passes the deterministic metadata check" goes red on main when the pull request merges. That happened by hand on Nov 10 with the election tests' pull request. The tool must never start a branch with an id that is already used.

**Cause.** Found in code: `startBranch` in scripts/pool/index.ts (line 867) writes docs/release/changes/<item id>.md from `releaseNote` in scripts/pool/draft-pr.ts (line 11), and neither reads docs/release/consumed-changes.json, where every released change id is listed under `entries[].changeIds`, nor the files already in docs/release/changes/ on main. `status <id> in-pr` checks only that the placeholder line is gone, by the same file name.

**Fix.** In scripts/pool, choose the note's id before the branch is started: the item's id when it is neither in docs/release/consumed-changes.json nor a file in docs/release/changes/ on origin/main, otherwise the item's id with `-2`, `-3` and so on until one is free. Write the note under that id (the file name and its `id:` line), print the note's path in what `next` prints, and make the `in-pr` guard find the note by scanning the branch's docs/release/changes/ for the placeholder line, not by the item's file name. Say in docs/pool/START-A-BUILDER.md, step 7, that the release note's file is the one `next` printed. Add tests in scripts/pool/next.test.ts: an item whose id is already in consumed-changes.json gets a `-2` note; one whose id is free gets its own id; the `in-pr` guard still refuses while a `-2` note holds the placeholder.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Replace, never layer: one function chooses the id, and `startBranch` and the guard both use it. The tool uses only git, npm and `gh`, and its tests never touch a real item on main. Plain American English in everything the tool prints.

**Done when.** A second session, on main, picks an item whose id is listed in docs/release/consumed-changes.json, runs `npm run pool -- next --dry-run` at that item's level until it is the one offered or reads the test that covers it, and sees the release note the tool would write carries an id that is not in that file; there is nothing to see in a drawn place of the game, because this is a tool. The pool tool's tests pass, and tests/release/release-workflow.test.ts passes on a branch the tool started for such an item.

**Waits on.** Nothing.

**Files.** scripts/pool/index.ts, scripts/pool/draft-pr.ts, scripts/pool/next.test.ts, docs/pool/START-A-BUILDER.md, docs/release/consumed-changes.json

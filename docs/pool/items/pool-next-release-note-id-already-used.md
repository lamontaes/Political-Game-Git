---
id: pool-next-release-note-id-already-used
title: "The pool command starts an item's branch with a release note whose id may already be used, which turns a release test red"
area: docs
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/pool-pool-next-release-note-id-already-used
pr: #8264
after:
blocked-on:
lead: cto
model: sonnet
effort: medium
root: rc2-done-from-records
source: found by Fable on Nov 10 while fixing a release test red on main (pull request #8228)
checked: fable 2026-11-10
claimed-at: 2026-11-10T23:04:33.858Z
branch: claude/pool-pool-next-release-note-id-already-used
---

**What.** `npm run pool -- next` starts each item's branch with a release note named after the item. An item that already had a merged pull request (a sent-back or reopened item) has that id recorded as released, so the note's id is refused and the release test "passes the deterministic metadata check" goes red on main when the pull request merges. That happened by hand on Nov 10 with the election tests' pull request. The tool must never start a branch with an id that is already used. The command's one real run on Nov 10 (the second session's report on issue 7365) found three more small things in the same code, and they are fixed here too: an item whose recorded pull request is closed is offered with that number as if it were live; a real run takes minutes and prints nothing until it ends; and a dry run gives different release times from a real run.

**Cause.** Found in code: `startBranch` in scripts/pool/index.ts (line 867) writes docs/release/changes/<item id>.md from `releaseNote` in scripts/pool/draft-pr.ts (line 11), and neither reads docs/release/consumed-changes.json, where every released change id is listed under `entries[].changeIds`, nor the files already in docs/release/changes/ on main. `status <id> in-pr` checks only that the placeholder line is gone, by the same file name. From the real run on main at f631d2ce: `next` printed pull request #8232 for carcass-audit-everything-not-engine-view-or-guard after that pull request was closed, because it prints the item's `pr:` field without asking whether it is open; the run passed a two-minute tool limit with no output, because it prints only at the end; and the dry run read branch times from the local checkout (`branchTip` with fetch off, line 808), so it showed 00:55 UTC where the real run, which fetches, showed 04:40.

**Fix.** In scripts/pool, choose the note's id before the branch is started: the item's id when it is neither in docs/release/consumed-changes.json nor a file in docs/release/changes/ on origin/main, otherwise the item's id with `-2`, `-3` and so on until one is free. Write the note under that id (the file name and its `id:` line), print the note's path in what `next` prints, and make the `in-pr` guard find the note by scanning the branch's docs/release/changes/ for the placeholder line, not by the item's file name. Say in docs/pool/START-A-BUILDER.md, step 7, that the release note's file is the one `next` printed. Add tests in scripts/pool/next.test.ts: an item whose id is already in consumed-changes.json gets a `-2` note; one whose id is free gets its own id; the `in-pr` guard still refuses while a `-2` note holds the placeholder. Also in `next`: when the item taken already carries `pr:`, ask whether that pull request is open (`gh pr view <number> --json state`, and where `gh` cannot answer, say plainly that it could not be checked); when it is closed or merged, say so and open or print a new draft, recording the new number. Print one line as each stage starts (releasing quiet claims, choosing, claiming, starting the branch, opening the pull request), so a run that takes minutes shows where it is. Make the dry run fetch each claimed branch as the real run does, or print beside each time that it comes from the local checkout. Add to docs/pool/START-A-BUILDER.md, step 1, that a real run can take several minutes.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Replace, never layer: one function chooses the id, and `startBranch` and the guard both use it. The tool uses only git, npm and `gh`, and its tests never touch a real item on main. Plain American English in everything the tool prints.

**Done when.** A second session, on main, picks an item whose id is listed in docs/release/consumed-changes.json, runs `npm run pool -- next --dry-run` at that item's level until it is the one offered or reads the test that covers it, and sees the release note the tool would write carries an id that is not in that file; there is nothing to see in a drawn place of the game, because this is a tool. The pool tool's tests pass, and tests/release/release-workflow.test.ts passes on a branch the tool started for such an item.

**Waits on.** Nothing.

**Files.** scripts/pool/index.ts, scripts/pool/draft-pr.ts, scripts/pool/next.test.ts, docs/pool/START-A-BUILDER.md, docs/release/consumed-changes.json

**Notes.** Claimed by next for sonnet-a266 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-10 23:04 UTC) on branch claude/pool-pool-next-release-note-id-already-used.

---
name: pool-notes
description: >
  How pool-only changes for Our Civic Duty reach main: cause write-ups, new
  items, status notes and relabels go as commits on the hour's own branch
  (named for the date and the hour), with one pull request for the hour,
  gated by Desk B and merged once an hour (owner, Nov 11), instead of one
  pull request each. Also the
  cap on new work while too many game pull requests are open. Use before you
  commit any change that touches only `docs/pool/items`, when you are Desk B
  or the CTO at the top of the hour, and before a builder takes a new item.
  Not for a game pull request's own item (it stays in that pull request), and
  not for rules, checks, skills or docs, which keep their own pull requests.
---

# Pool notes: one bundle an hour

Owner, Nov 11, 2026, on pull requests that only change the work list: "I feel like it's only worth merging things in the game, right? ... It's causing a lot of unnecessary problems, aren't they?" In three hours that night, 77 of 184 new pull requests touched only docs, the pool or skills. The CTO proposed one bundle an hour and a cap on new work; his answer: "Yes, and update everything that needs to be updated."

The pool stays on main, because sessions on both accounts read it there. What changes is how a note gets there.

## What goes in the bundle

Any change that touches only files under `docs/pool/items/`:

- a cause and fix written into an item (`docs/pool/FIND-A-CAUSE.md`);
- a new item, or an item split into parts;
- a Notes paragraph (a re-run, a replay, evidence added to a match);
- a relabel (`Seen:`, `Feeds:`, `Guards:`), a `checked:` line, a status set by hand.

What does not go in it:

- **A game pull request's own item.** A pull request that builds an item changes that item's file inside itself, as before.
- **Rules, checks, skills and docs.** Each keeps its own pull request and merges first (owner, Nov 10).
- **Anything under `src`, `data`, `art`, `tests` or `scripts`.**

## The hour's branch

Each hour has its own branch, cut from main and named for the hour it closes in UTC: `pool/notes-<date>-<hour>`. A note committed at 08:20 UTC on Nov 11 goes to `pool/notes-2026-11-11-09`. After 09:00 nobody commits to that branch; a late note goes to the next hour's.

Why not one rolling branch: it was tried on Nov 11 and failed twice in two hours. Helpers commit all hour, so its head moved under every gate. And main takes each bundle as one squashed commit, so the rolling branch then conflicted with main on every file touched again.

## How a helper adds a note

1. Write the item to the standard and check it in your own copy: `npm run pool -- --check` shows nothing new against main, and prettier passes on the file. The check finds the What's `Seen:` sentence only after a sentence that ends in `.`, `!` or `?`; after a closing quote (`…wait." Seen:`) it misses it, so start `Seen:` on its own line when the sentence before it ends in a quote (Playtester P1, Nov 13).
2. Find the hour's branch. If it does not exist yet, create it from main (the GitHub tool's `create_branch` with `from_branch: main`), and after your first commit open its pull request: title `pool: the notes of <hour>:00 UTC, <date>`, line 1 `Touches pool item: this hour's notes; nothing built.`, not a draft.
3. Commit the one file to that branch through GitHub's contents API (the GitHub tool's `create_or_update_file`; read the file on the branch first for its `sha` when it exists). One item file per commit. The message is `pool: <item id>: <what changed in five words>`. Do not push a branch of your own and do not open any other pull request.
4. If the commit is refused because the file changed under you, read it again from the branch, put your change on top of what is there, and commit again. Never overwrite another helper's paragraph.
5. Post one line on the crew's issue: `<your prefix>: noted <item id> <the commit's full sha>` and the cause in two sentences. The line is how the lead and the CTO read your finding; the bundle is only how it reaches main.
6. A note needs no release note of its own. The desk adds the hour's.
7. Once an item is being built, its notes go to its pull request's branch, not the bundle. And a builder whose item reached main through a bundle merges main into the branch before posting ready and keeps both sides of the item file: on Nov 11 two passed words pull requests could not join their train because main's copy of their item and the branch's differed.

## Desk B, at the top of each hour

The hour's pull request is an ordinary pool-only pull request, and its head stops moving at the top of the hour.

1. A few minutes past the hour, gate it as you gate any pool-only pull request: main merged in, `npm run pool -- --check`, prettier, the release check, the guards.
2. A commit that fails: tell its author on the crew's issue with the check's own words. The author fixes it with a new commit on the same branch; gate what changed since.
3. If the hour's release note is missing (`docs/release/changes/pool-notes-<date>-<hour>.md`, with only `id` and `impact: none` in the front matter and one sentence under it), say so; the lead or the first helper adds it.
4. Post `Desk B: ready #<its number> <head sha>` with how many items it holds.
5. A branch that conflicts with main (an item's status changed on main during the hour) goes back to the lead, who merges main into it and keeps both sides' lines.
   The lead does not wait to be asked: at the top of the hour, before the desk gates, the lead merges main into the hour's branch, keeps both sides of any item a builder claimed or changed on main since the cut, runs `npm run pool -- --check`, and posts the new head. On Nov 11 two bundles in a row came back from the desk for one item each, the second an item `pool next` had handed out and taken back six times in forty minutes.
6. An hour with no notes has no branch and no pull request.

## Whoever holds the merge step, once an hour

Merge the hour's pull request on the sha Desk B posted. A note that waits an hour costs nothing; a note that merges unread costs a builder's day. If the bundle is red, merge nothing and say which commit the author should fix.

## The cap on new work

While more than **150 game pull requests are open**, `npm run pool -- next` hands out no new item. A builder then does two things only, in this order: fix what a desk sent back on its own pull requests, and merge main into its own open pull requests whose head is behind. When neither is left, it stops and says so on the crew's issue; an idle builder costs less than one more pull request nobody can gate.

- A game pull request is an open pull request that is not the notes bundle and not a rules, checks, skills or docs pull request.
- The lead's hourly count on the crew's issue says how many are open and whether the cap is on.
- The cap never stops a red on main, a rule, check or skill, or work the CTO or the lead assigns by name (on Nov 11: the opening's words).
- The number is the lead's to set (CTO, Nov 11). It is 150 because the desks gated about 40 game pull requests in the three hours before the ruling.

## What is still done the old way

`npm run pool -- claim`, `next` and `release` still push a status commit to main. Reading "claimed" and "in a pull request" from the open pull requests' own first lines, so those commits stop, is the pool tool's next change; until it lands, nothing here changes how a builder claims.

## Stop condition

A note is delivered when its commit is on the hour's branch and its line is on the crew's issue. The hour is done when its pull request is merged.

## A merger on any tool (Nov 11)

A merger started from `docs/pool/START-A-MERGER.md` gates the hour's bundle with the pool check alone and merges it pinned to the head in the cut line. A bundle that touches a file outside `docs/pool/` and `docs/release/changes/` is sent back.

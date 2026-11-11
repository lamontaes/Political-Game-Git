---
name: pool-notes
description: >
  How pool-only changes for Our Civic Duty reach main: cause write-ups, new
  items, status notes and relabels go as commits on one rolling branch,
  `pool/notes`, with one pull request open, gated by Desk B and merged by the
  CTO once an hour (owner, Nov 11), instead of one pull request each. Also the
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

## How a helper adds a note

1. Write the item to the standard and check it in your own copy: `npm run pool -- --check` shows nothing new against main, and prettier passes on the file.
2. Commit the one file to the branch `pool/notes` through GitHub's contents API (the GitHub tool's `create_or_update_file`; read the file on `pool/notes` first for its `sha` when the item already exists there). One item file per commit. The message is `pool: <item id>: <what changed in five words>`. Do not push a branch of your own and do not open a pull request.
3. If the commit is refused because the file changed under you, read it again from `pool/notes`, put your change on top of what is there, and commit again. Never overwrite another helper's paragraph.
4. Post one line on the crew's issue: `<your prefix>: noted <item id> <the commit's full sha>` and the cause in two sentences. The line is how the lead and the CTO read your finding; the bundle is only how it reaches main.
5. A note needs no release note of its own. The bundle carries one.

`pool/notes` always exists; commit to it at any minute. Fetch and merge before you push, and never force-push it.

## Desk B, at the top of each hour

`pool/notes` is a rolling branch. It is never the head of a pull request, because helpers commit to it all hour and a head that moves under the gate can never be merged at the sha that was checked (Nov 11: the first bundle, #8714, moved three times during its gate). Each hour's pull request is opened from a frozen branch.

1. Fetch `pool/notes`. Note its head sha: that is the hour's cut. In your own tree, check out that sha and merge main into a scratch branch. Run `npm run pool -- --check` and prettier on the items the cut changes.
2. A commit that fails: tell its author on the crew's issue with the check's own words. The author fixes it with a new commit on `pool/notes`; take the new head as the cut and check only what changed since (`git diff <old cut>..<new cut>`).
3. Freeze the cut: `git push origin <cut sha>:refs/heads/pool/notes-<date>-<hour>` (for example `pool/notes-2026-11-11-07`). Open the hour's pull request from that branch. Its line 1 is `Touches pool item: the <n> items in this hour's notes; nothing built.` and its title is `pool: the notes of <hour> UTC, <date>`.
4. Post `Desk B: ready #<its number> <cut sha>` with how many items it holds. Commits that reach `pool/notes` after the cut ride the next hour.
5. An hour with no commits since the last cut has no bundle.
6. When main has moved far from `pool/notes` (a note's item was changed on main), merge main into `pool/notes` and push; never rebase it.

## Whoever holds the merge step, once an hour

Merge the hour's pull request on the cut sha Desk B posted. A note that waits an hour costs nothing; a note that merges unread costs a builder's day. If the bundle is red, merge nothing and say which commit the author should fix.

## The cap on new work

While more than **150 game pull requests are open**, `npm run pool -- next` hands out no new item. A builder then does two things only, in this order: fix what a desk sent back on its own pull requests, and merge main into its own open pull requests whose head is behind. When neither is left, it stops and says so on the crew's issue; an idle builder costs less than one more pull request nobody can gate.

- A game pull request is an open pull request that is not the notes bundle and not a rules, checks, skills or docs pull request.
- The lead's hourly count on the crew's issue says how many are open and whether the cap is on.
- The cap never stops a red on main, a rule, check or skill, or work the CTO or the lead assigns by name (on Nov 11: the opening's words).
- The number is the lead's to set (CTO, Nov 11). It is 150 because the desks gated about 40 game pull requests in the three hours before the ruling.

## What is still done the old way

`npm run pool -- claim`, `next` and `release` still push a status commit to main. Reading "claimed" and "in a pull request" from the open pull requests' own first lines, so those commits stop, is the pool tool's next change; until it lands, nothing here changes how a builder claims.

## Stop condition

A note is delivered when its commit is on `pool/notes` and its line is on the crew's issue. The hour is done when the bundle is merged and the next one is open.

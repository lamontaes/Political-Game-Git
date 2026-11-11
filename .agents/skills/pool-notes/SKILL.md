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

If `pool/notes` does not exist when you come to commit (the hour's merge just happened), wait two minutes and try again; Desk B cuts the new one. Do not create it yourself.

## Desk B, at the top of each hour

1. Fetch `pool/notes` and merge main into it in your own tree. Run `npm run pool -- --check` and prettier on the items it changes. Fix what is mechanical (formatting, a path that needs ` (new)`); for anything else, revert that one commit on the branch and tell its author on the crew's issue with the check's own words.
2. Post `Desk B: ready #<the bundle's number> <full head sha>` with how many items it holds.
3. After the CTO merges it: cut `pool/notes` again from main, add the hour's release note (`docs/release/changes/pool-notes-<date>-<hour>.md`, with only `id` and `impact: none` in the front matter and one sentence under it), and open the next pull request. Its line 1 is `Touches pool item: many (the hour's pool notes; nothing built).` and its title is `pool notes: <date>, <hour> UTC`.
4. An hour with no commits has no bundle to gate. Leave the open pull request as it is.

## The CTO, once an hour

Merge the bundle on the head Desk B posted. A note that waits an hour costs nothing; a note that merges unread costs a builder's day. If the bundle is red, merge nothing and say which commit Desk B should take out.

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

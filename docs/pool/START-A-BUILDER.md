# Start a builder

Owner, Nov 10, 2026: "can you make a general pool command again? ... it needs to be model agnostic ... being able to be picked up by codex, muse, etc. ... and i want it to be session proof."

This page is for any agent, on any tool or account, with no context: Claude, Codex, Muse or another. It tells you how to take the next right item from the pool, build it, and leave it so the next agent can carry on. It uses only git, npm and a way to open a pull request (`gh`, or your tool's own GitHub functions).

## The command to paste

The owner pastes this, with the level filled in:

> You are a builder for the game in lamontaes/Political-Game-Git. Read `AGENTS.md`, then `docs/pool/START-A-BUILDER.md`, and follow that page exactly. Your level is `<haiku | sonnet | opus>`. Loop: run `npm run pool -- next --model <level> --agent <a short name for you>`; it claims one item and gives you its branch and its draft pull request. Read the item. Check its Cause against the code, and if the code differs, say so on the pull request, release the item and take the next. Build the Fix and nothing more, with its test passing in two drawn places. Fill in the pull request, mark it ready, and take the next item. Everything about an item goes on its pull request: progress, questions, and a handoff note whenever you stop. Never build an item that says "Needs cause". Never write lines under `data/english/parts/`. Stop cleanly when your usage or the item's time box runs out. Done when the pool has no item left for your level, or you are told to stop.

## Your level

Every item names the least capable model that can build it from the item alone: `haiku`, `sonnet`, `opus` or `fable`, lowest to highest. `next` gives you items at your own level first, and lower levels only when none are left at yours. It never gives you an item above your level.

If you are not a Claude model, use the level the owner gave you. With none given, use `sonnet`.

## Before the first item

1. Work in a checkout of the repository. On the owner's Mac, never make another copy: read `.agents/rules/storage-and-workspaces.md` first. In a cloud container, run every npm command with `OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14"` set.
2. Run `npm install` once. Never `npm ci`.
3. Read `AGENTS.md`: all of "Standing owner rules", "Placeholders" and "Process".

## The loop

1. **Take an item.** `npm run pool -- next --model <level> --agent <name>`.
   - It picks the first item in the written order that your level may build, claims it on main so no other agent can take it, makes the item's branch and opens its draft pull request.
   - If your tool may push only under its own prefix, add `--branch-prefix <prefix>` (a Claude cloud session uses `claude/pool-`).
   - If it cannot open the pull request itself, it prints the title and a file holding the body. Open a draft pull request from the branch with those, then record it: `npm run pool -- claim <id> --branch <branch> --pr <number>`.
   - If it says **continue**, another agent started this item. Read its pull request from top to bottom and the branch's commits before you change anything.
2. **Read the item,** `docs/pool/items/<id>.md`, and every document and skill its Rules name. Skills are plain markdown under `.agents/skills/<name>/SKILL.md`.
3. **Check the Cause against the code** before changing anything. If a function is gone, or the code does not do what the Cause says, do not guess and build. Write what differs on the pull request, with file and line, run `npm run pool -- release <id> --reason "<one sentence>"`, and take the next item.
4. **Build the Fix and nothing more.** Commit each working unit with its test passing, and push after every commit.
5. **Prove it in two drawn places.** Write the test or printed proof the item's Done when names, and run it with two seeds. Name each place and seed. A test draws its place with the repository's `drawPlace`, names the place and seed in every failure, and never returns early in a way that passes without checking.
6. **Run only your own checks:** the test files you wrote or changed and those the item names, one at a time; prettier and eslint on the files you changed; `npm run zero-dice` if you changed anything under `src/core2`; `npm run test:skill-ops` if you changed a skill or `AGENTS.md`. A checker runs the full gate, not you. If a test you did not write fails, run it on clean main with the same seed. If it fails there too it is not yours: say so on the pull request with the test, place and seed.
7. **Fill in the pull request.** Its body was made for you from the template: say what changed for the player, give the evidence for each Done-when line, how a second session checks it in the game, the break-it check, and what was removed. Replace the release note's placeholder line. Then mark the pull request ready and run `npm run pool -- status <id> in-pr --pr <number>`.
8. **Take the next item.** You never merge your own pull request.

## The pull request is the item's thread

A session can end at any moment. Nothing may live only in your conversation.

- **Progress.** After each pushed unit, add one comment: what is done, what is next, and anything the next agent must know.
- **Questions.** A question for the owner or the CTO is a comment that starts with "Question:" and ends with what you read before asking (`AGENTS.md`, "Look before you ask"). Then build the simplest version the rules allow and say so. Nothing waits.
- **Send-backs.** The checker and the merge desk answer on the same pull request. A sent-back item is yours until you hand it off.
- **Handoff.** When you stop for any reason, add a comment that starts with "Handoff:" and says what is done, what is not, how to run the proof, and the next step. Leave the claim in place.
- **Stale claims.** A claimed item whose branch has had no push for twice its time box is released by the next agent's `next`, which then offers it as **continue**. Its pull request and branch stay as they are.

## When you stop

- **The item's time box is used.** Push what passes, write the handoff, and take the next item only if your usage allows.
- **Your usage is running out.** Write the handoff first.
- **The item needs words.** Every line under `data/english/parts/` is written by the Story session. List each spot and what it must say in the pull request, and build everything else.

## The order

`next` sorts by the order in `docs/pool/order.json`, and nothing else decides it:

1. **Priority.** 1 before 2 before 3. Priority 1 is a red on main or what the owner asked for now.
2. **Class.** Rules, checks and skills first. Then the critical path: the country tier and its clock, the life record, the words machine. Then what stops play. Then the rest.
3. **What it unblocks.** The item more items wait on comes first.
4. **Effort,** low before high, then **size,** small before large.

An item is offered only when it is open, carries `checked: fable`, has a known cause, and waits on nothing that is not yet on main.

## What you never do

- Build an item whose Cause says "Needs cause", or one above your level.
- Write, change or delete a line under `data/english/parts/`.
- Decide what a person, business or body does by chance or a fixed percentage.
- Name a state, city or place key in logic. A named place appears only in a test, as a labeled case.
- Type a number into logic. Numbers live in a parameter table with a tag.
- Leave a shortcut unregistered. Each is a stopgap row in its family file under `src/core2/data/stopgaps/`.
- Leave old code beside new. The old path is deleted in the same change.
- Weaken, skip or delete a test to get it to pass.
- Force-push, merge your own pull request, or edit `docs/pool/INDEX.md`.
- Put the game's title where outsiders can see it.

Sign commits and pull requests the way your own tool does. No fixed co-author line or session link is required.

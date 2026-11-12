# Start a builder

Owner, Nov 10, 2026: "can you make a general pool command again? ... it needs to be model agnostic ... being able to be picked up by codex, muse, etc. ... and i want it to be session proof." And later that day: "I might not be using Claude for these... they're not all going to be Opus, Sonnet, or Haiku. And I'm not choosing the name."

This page is for any agent, on any tool or account, with no context: Claude, Codex, Muse or another. It tells you how to take the next right item from the pool, build it, and leave it so the next agent can carry on. It uses only git, npm and a way to open a pull request (`gh`, or your tool's own GitHub functions).

## The command to paste

The owner pastes this as it is. Nothing in it is filled in by him:

> You are a builder for the game in lamontaes/Political-Game-Git. Read `AGENTS.md`, then `docs/pool/START-A-BUILDER.md`, and follow that page exactly. First check in: run `npm run pool -- check-in --as` followed by, in quotes, the model you are running on and the tool you are running in, in your own words. It gives you your name and your tier. Then loop: run `npm run pool -- next`; it claims one item and gives you its branch and its draft pull request. Read the item. Check its Cause against the code, and if the code differs, say so on the pull request, release the item and take the next. Build the Fix and nothing more, with its test passing in two drawn places. Fill in the pull request, mark it ready, and take the next item. Everything about an item goes on its pull request: progress, questions, and a handoff note whenever you stop. Never build an item that says "Needs cause". Never write lines under `data/english/parts/`. Stop cleanly when your usage or the item's time box runs out. Done when the pool has no item left for your tier, or you are told to stop.

## Your name and your tier

You name yourself, once, by saying what you are: `npm run pool -- check-in --as "<your model and your tool>"`, for example `--as "GPT-5 Codex in the Codex CLI"`. Say it truthfully and in your own words. The tool answers with a name made for you (a short stem and four characters nobody else has) and your tier, and keeps both in this checkout, so every later `next` knows you. A new checkout checks in again and gets a new name.

There are four tiers, weakest first: `light`, `mid`, `top` and `lead`. The table that maps models and tools to tiers is `docs/pool/tiers.json`. It is the crew's judgment of each model on this repository, and the CTO moves a row when a model's merged work shows it is stronger or weaker. A model the table does not know, or an agent that says nothing, is `mid`.

Every item names the least capable model that can build it from the item alone, in its `model:` field: `haiku` is a light item, `sonnet` a mid one, `opus` a top one, and `fable` is for the lead. `next` gives you items of your own tier first, and lower ones only when none are left at yours. It never gives you an item above your tier.

Your first claim also puts one small file about you on main, under `docs/pool/agents/`: your name, your tier and what you said you are. That is the check-in. Nobody has to post or approve anything.

## Before the first item

1. Work in a checkout of the repository. On the owner's Mac, never make another copy: read `.agents/rules/storage-and-workspaces.md` first. In a cloud container, run every npm command with `OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14"` set.
2. Run `npm install` once. Never `npm ci`.
3. Read `AGENTS.md`: all of "Standing owner rules", "Placeholders" and "Process".

## The loop

1. **Take an item, unless the cap is on.** While more than 150 game pull requests are open, take no new item: fix what a desk sent back on your own pull requests, then merge main into your own open pull requests that are behind, then stop and say so on the crew's issue (owner, Nov 11; skill `pool-notes`; the lead's hourly count says whether the cap is on). Reds on main, rules, checks and skills, and work the CTO or the lead gives you by name are not capped. Otherwise: `npm run pool -- next`. It starts by saying who you are and your tier. A real run can take several minutes (it fetches every claimed branch); it prints a line to standard error as each stage starts, so a quiet terminal is not a hung one.
   - It picks the first item in the written order that your level may build, claims it on main so no other agent can take it, makes the item's branch and opens its draft pull request.
   - The branch is named `pool/<item>`. A Claude cloud session may push only under `claude/`, and the tool sees that by itself and names the branch `claude/pool-<item>`. If your tool has a prefix of its own, set `POOL_BRANCH_PREFIX` once or add `--branch-prefix <prefix>`.
   - The owner or the CTO can set a tier or a name by hand with `--tier <tier>` and `--agent <name>`. You do not.
   - If the item already names a pull request, `next` asks `gh` whether it is open; a closed or merged one is replaced by a new draft, and the new number is recorded.
   - If it cannot open the pull request itself, it prints the title and a file holding the body. Open a draft pull request from the branch with those, then record it: `npm run pool -- claim <id> --branch <branch> --pr <number>`.
   - If it says **continue**, another agent started this item. Read its pull request from top to bottom and the branch's commits before you change anything.
   - To take only gameplay work (what the player clicks and plays), add `--for play`; the kinds are in `docs/pool/order.json`. With nothing of that kind left for your tier it takes nothing and says so.
   - To see what it would take without changing anything, add `--dry-run`. To skip opening the draft, add `--no-pr`; it then prints the title and body file.
   - Check out the branch it names before you change anything: `git fetch origin <branch> && git checkout -B <branch> origin/<branch>`.
2. **Read the item,** `docs/pool/items/<id>.md`, and every document and skill its Rules name. Skills are plain markdown under `.agents/skills/<name>/SKILL.md`.
3. **Check the Cause against the code** before changing anything. If a function is gone, or the code does not do what the Cause says, do not guess and build. Write what differs on the pull request, with file and line, run `npm run pool -- release <id> --reason "<one sentence>"`, and take the next item.
   - When you change an item's Cause to "Needs cause.", set its Fix to "None until the cause is found." in the same commit, and move the old fix text to Notes. Otherwise main's pool check goes red for everyone (Nov 10: three items, fixed by the CTO by hand).
4. **Build the Fix and nothing more.** Commit each working unit with its test passing, and push after every commit.
5. **Prove it in two drawn places.** Write the test or printed proof the item's Done when names, and run it with two seeds. Name each place and seed. A test draws its place with the repository's `drawPlace`, names the place and seed in every failure, and never returns early in a way that passes without checking.
6. **Run only your own checks:** the test files you wrote or changed and those the item names, one at a time; prettier and eslint on the files you changed; `npm run zero-dice` if you changed anything under `src/core2`; `npm run test:skill-ops` if you changed a skill or `AGENTS.md`. A checker runs the full gate, not you. If a test you did not write fails, run it on clean main with the same seed. If it fails there too it is not yours: say so on the pull request with the test, place and seed.
7. **Fill in the pull request.** Its body was made for you from the template: say what changed for the player, give the evidence for each Done-when line, how a second session checks it in the game, the break-it check, and what was removed. Replace the release note's placeholder line in the note file `next` printed (`docs/release/changes/<id>.md`, or `<id>-2.md` and so on when main already used the item's id) and push it; `status <id> in-pr` refuses until you do. Then mark the pull request ready (`gh pr ready <number>`, or your tool's own button or API) and run `npm run pool -- status <id> in-pr --pr <number>`. Ready means the pull request is no longer a draft; if your tool cannot take it out of draft, post one comment on it that starts with `Ready for the desk:` followed by the head commit's hash, and the desk treats that the same way.
8. **Take the next item.** You never merge your own pull request.

## The pull request is the item's thread

A session can end at any moment. Nothing may live only in your conversation.

- **Progress.** After each pushed unit, add one comment: what is done, what is next, and anything the next agent must know.
- **Questions.** A question for the owner or the CTO is a comment that starts with "Question:" and ends with what you read before asking (`AGENTS.md`, "Look before you ask"). Then build the simplest version the rules allow and say so. Nothing waits.
- **Ready.** Ready means the pull request is no longer a draft: mark it ready with `gh pr ready <number>` or your tool's own button or API. If your tool cannot take it out of draft, post one comment that starts with `Ready for the desk:` followed by the head commit's hash; the desk treats that the same way.
- **Send-backs.** The checker and the merge desk answer on the same pull request. A sent-back item is yours until you hand it off. A send-back goes on the item's own pull request, never on issue 8928.
- **Handoff.** When you stop for any reason, add a comment that starts with "Handoff:" and says what is done, what is not, how to run the proof, and the next step. Leave the claim in place.
- **An item you take, you start.** Never open a pull request that says "not started", and never leave a claim on an item you did not start: a claimed item is offered to nobody. If you will not build it, run `npm run pool -- release <id> --reason "<one sentence>"`, close its draft, and take the next. On Nov 11 one builder took eight items in a row, wrote "not started" on each and left every claim in place.
- **Stale claims.** A claim older than twice its time box, whose branch has had no push for that long (or, with no branch, whose claim is that old), is released by the next agent's `next`, which then offers it as **continue**. Its pull request and branch stay as they are.

## When you stop

- **The item's time box is used.** Push what passes, write the handoff, and take the next item. An item bigger than its box is built as its first working part: finish that part with its test, say on the pull request what is left, and change line 1 to `Touches pool item:` so the item stays open.
- **Your usage is running out.** You cannot see your usage, so do not guess at it. Never take an item and hand it off unstarted "for usage". Keep building; if the run truly ends, the stale-claim rule above covers the item you were on.
- **The item needs words.** Every line under `data/english/parts/` is written by the session that holds words (Fable B since Nov 10, owner ruling) or the helper it names for that file. List each spot and what it must say in the pull request, and build everything else.

## The order

`next` sorts by the order in `docs/pool/order.json`, and nothing else decides it:

1. **What the player sees** (owner, Nov 11: "prioritize all of the visible changes"). Reds on main and rules, checks and skills still come before everything. Then play and screens work. Then every other item whose What says `Seen:`. Then `Feeds:`, then `Guards:`, then the rest.
2. **Priority.** 1 before 2 before 3. Priority 1 is a red on main or what the owner asked for now.
3. **Class.** Rules, checks and skills first. Then the critical path: the country tier and its clock, the life record, the words machine. Then what stops play. Then the rest.
4. **What it unblocks.** The item more items wait on comes first.
5. **Effort,** low before high, then **size,** small before large.

An item is offered only when it is open, carries `checked: fable`, has a known cause, has every `after:` item on main, and has a Waits on that says "Nothing" or names only items already on main. A Waits on that names anything else (an owner decision, the Story session's lines, early-access preparation) is not offered.

## What you never do

- Build an item whose Cause says "Needs cause", or one above your tier. Finding a cause is its own job, with its own page: `docs/pool/FIND-A-CAUSE.md`.
- Say you are a model you are not, to be given harder items.
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

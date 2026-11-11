# The pool: every piece of work, in one place

Owner, Oct 15, 2026: "the pool needs to have ALL work so nothing is lost or falls through the cracks, from bug fixes to features, everything, all in one place so I can view everything and every session can just pick something up."

This folder is that place. It replaces the pool lists inside work orders, the "Needs from other sessions" lists in status files, the GitHub Project (sessions cannot write it) and the CTO's memory. If work is not here, it does not exist.

## How it works

- **One file per item,** `docs/pool/items/<id>.md`, where `<id>` is `<area>-<short-name>` (`laws-cannabis-read`, `gov-empty-race-holdover`, `play-calendar-contrast`). One file per item means two sessions never edit the same file to claim or close different work.
- **The index,** `docs/pool/INDEX.md`, is generated from the item files: one table, grouped by status then priority, so the owner reads one page. **It is main's alone** (Nov 3, `pool-generated-index-merge-starvation`): its count line changes with every status, so two branches that each wrote it always conflicted. It is written only on main, by a claim, status or seen push, the merge flip and the Pool index workflow, which regenerates it after every push to main that changes an item. On a branch `npm run pool` checks the items and leaves the index alone, and `npm run pool -- --check` fails if the branch changes it (fix: `git checkout origin/main -- docs/pool/INDEX.md` after merging main). On main the check fails when it is stale. Never edit the index by hand; the local gate runs the check.
- **Anyone adds an item.** A session that finds a bug, a gap, a stopgap it cannot close, a question the owner answered that implies work, or a piece of its own order it could not finish, adds a file in the same PR. The CTO adds the owner's asks from chat. Nothing is tracked anywhere else.
- **Claim on main, before you build** (owner, Oct 15): run `npm run pool -- claim <id> --branch <your-branch>`; it pushes a one-file commit to main so every session sees the claim within seconds. If it says already claimed, take the next item. Status changes (`in-pr`, `blocked`) go the same way (`npm run pool -- status <id> in-pr --pr N`). Never edit an item's status in your feature PR. Line 1 of your PR body is exactly `Pool item: <id>` (no backticks): when the PR merges into main, the pool-done workflow flips that item to `merged` by itself (it also finds an `in-pr` item whose `pr:` field names the PR), and a merger can set the same with `npm run pool -- status <id> merged --pr N`. `merged` means the work is on main and no second session has seen it in the running game yet; it is not `done`. A merge into another PR's branch flips nothing. `status` also takes `open` and `blocked --blocked-on <id>`.
- **Seen in the game makes it done** (owner's ruling, Nov 3, as `OWNER-DECISIONS.md` records it: "Checkers never hold a merge; nothing is done until a second session replays its finish line on main; only confirmed work moves the number"). A second session, never the builder, opens the game on main in a drawn place, replays the item's Done when and runs `npm run pool -- seen <id> --by <who> --place "<place>" --seed <seed> --main <commit> --saw "<what was on screen, 8 words or more>"`. That sets `done`, records `seen-by` and `seen-at`, and adds the line to the item's Notes. When the game does not show it, `npm run pool -- seen <id> --not --by <who> --place "<place>" --seed <seed> --main <commit> --saw "<what was seen instead>"` sets the item back to open with that line in Notes, so the next builder reads why. The index lists what is waiting under "Merged, waiting to be seen in the game", oldest merge first. Work with no running-game check (docs, skills, pool hygiene) is closed by the CTO with `npm run pool -- status <id> done --by=cto`, and `dropped` is set the same way (the `--` is required, since npm swallows a flag written before it; `POOL_BY=cto` in the environment works too).
- **Build gates:** an item with `after:` waits until those items are merged (a gate opens at merge and does not wait for the seen check); the index lists it under Gated and keeps it out of Next up, so take the top of Next up without reading further. **Merge gates** (the changed-file checks, the morning check) are the merger's problem; a builder only writes its one gate line.
- **A merger's send-back reopens the item** (owner, Oct 15): the merger sets it open with the reason and the branch in Notes; the next builder claims it with that branch, which transfers the branch to them, and finishes it there (`pr-fixer`). Bugs the merger finds elsewhere become new items.
- **Stale claims** (owner, Nov 10): a claim older than twice its item's time box (the first number of hours in its Time box, 4 when none), whose branch has had no push for that long either (or, with no branch, whose claim time is that old), is released by the next `npm run pool -- next`: the item goes back to open, keeps `branch:` and `pr:`, and gets a Notes line saying when, why and where to continue. `next` then offers it as **continue**. A builder who stops on purpose runs `npm run pool -- release <id> --reason "<one sentence>"`, which does the same with the reason.
- **Adding:** `npm run pool -- add <id> --title ... --area ... --kind ... --priority N --size S|M|L [--after a,b] --what ... --cause ... --fix ... --timebox <hours> --rules ... --done ... --waits ... --files ... --model ... --effort ... --root ... --lead ...` creates the item at the standard and pushes it to main. Every flag but `--after`, `--size` and `--notes` is required, whatever the priority; `add` lists what is missing and refuses an item that would fail the standard or the quality check below.
- **Size** (owner, Oct 15): an L item is split by the session that claims it into bounded sub-items in the pool (each S or M with its own done-when) before any building; the L item becomes `blocked-on` its parts.
- **Pick in order:** `npm run pool -- next` takes the next item for you, so nobody chooses by hand. An agent says what it is once (`npm run pool -- check-in --as "<its model and tool>"`), and the tool names it and finds its tier (light, mid, top or lead) in `docs/pool/tiers.json`; an item's `model:` of haiku, sonnet, opus or fable is the tier that may build it. The order is written once, in `docs/pool/order.json`: what the player sees first (reds on main and rules, checks and skills; then play and screens work; then other items whose What says `Seen:`; then `Feeds:`; then `Guards:`; then the rest); then priority; then class (rules, checks and skills; the critical path; what stops play, in the order `docs/play-first/ORDER.md` gives; the rest); then how many live items wait on it, more first; then effort, size and id. `next` takes only items that are open, carry `checked: fable`, have a known cause, have every `after:` on main, and whose Waits on says Nothing or names only items on main; it takes your level first and lower levels when yours run out, never a higher one. The index's "Next up" (the first 15 open items, in the same order) and "Ready by model" (for each level, how many items `next` can take and the first 15) follow the same order. A session with an assignment finishes it, then runs `next`.
- **Next, in full:** `npm run pool -- next [--as "<model and tool>"] [--tier <tier>] [--agent <name>] [--branch-prefix <prefix>] [--no-pr] [--dry-run]` releases stale claims, claims the item on main (two callers never get one item: the one that loses the push takes the next), records `branch:` (`pool/<id>` by default, `claude/pool-<id>` in a Claude cloud session, or the branch the item already has) and a Notes line naming the agent. An agent's first claim also adds its check-in file, `docs/pool/agents/<name>.json`. It starts the branch from main with one commit adding `docs/release/changes/<id>.md` holding a placeholder line, writes the draft pull request's body (the template with one Done when row per sentence, the item as claimed, and the thread rules from `docs/pool/START-A-BUILDER.md`) and opens it with `gh pr create --draft`. Without `gh`, or with `--no-pr`, it prints the title and the body file: open the draft yourself and record it with `npm run pool -- claim <id> --branch <branch> --pr <number>`. `status <id> in-pr` refuses while the release note still holds the placeholder. `--dry-run` prints what it would do and changes nothing.

## Pool notes go in one bundle an hour

A change that touches only `docs/pool/items` (a cause written in, a new item, a note, a relabel) is one commit on the hour's own branch, `pool/notes-<date>-<hour>`, which has one pull request open. Desk B gates it and the CTO merges it once an hour, then a fresh branch is cut from main (owner, Nov 11). A game pull request still changes its own item inside itself, and rules, checks, skills and docs keep their own pull requests. While more than 150 game pull requests are open, `next` hands out no new item. The skill `pool-notes` is the how.

## Prompts

### Any agent

Any agent with repository access (Claude, Codex, Cursor, Antigravity, Muse or another) may take pool items. The paste command, with the level filled in, is in [START-A-BUILDER.md](START-A-BUILDER.md) under "The command to paste"; that page is the whole loop. The claim on main is the only coordination; merger sessions merge, and nobody merges their own PR.

### Merger

> Read AGENTS.md and .agents/skills/merger/SKILL.md in lamontaes/Political-Game-Git. Act as the merger for your share: <PR numbers with an even number | odd number | number mod 4 equal to N>, <oldest | newest> first; start every comment with "<Name> merger:". For each open PR in your share, merge main into it, run only the changed-file checks in your own cloud environment (never the full suite, never wait on GitHub's runs), apply the morning check, merge on green or comment once with the exact reason, mark merged items merged with `npm run pool -- status <id> merged --pr N` (never done; a second session's `pool seen` does that), and cancel stale GitHub runs. Never merge a PR you authored, never force-push, never run the full suite. End with a table of what you did. If the latest release run on main is red, claim the pool item release-main-red, fix it at the root on its own branch and PR, then go on with your work. When you send a PR back, set its pool item open with the reason and branch in Notes, and file any other defect you find as a new pool item. You are in a cloud environment: set OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" on every npm command and never ask the owner to confirm it.

### Checker

> Read AGENTS.md and the "Done" section of .agents/skills/play-first/SKILL.md in lamontaes/Political-Game-Git. Start the bench (`npm run bench`) and play as the owner would, one hour, from a new game in a drawn place: note every defect with what you did, what you saw and what you expected, and file each as a pool item in docs/pool/items (kind bug, priority 1 for anything that stops play), with screenshots, on one branch and one PR. Never edit code. You are in a cloud environment: set OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" on every npm command and never ask the owner to confirm it.

## The item file

The standard is `.agents/rules/pool-item-standard.md` (owner, Nov 10: every assignment works without Fable; "I don't want any work to be done unless Fable found the fix"). An item carries `standard: 2` and says enough that whatever model picks it up can build it from the item alone. **An item without `standard: 2` is from before the standard and is being redone**; the check judges it as it always did.

```markdown
---
id: laws-cannabis-read
title: Cannabis sales law reaches retailers and buyers
area: laws # laws | gov | elections | office | world | core | people | director | words | play | art | release | docs
kind: wiring # bug | feature | wiring | stopgap | research | cleanup | owner-decision
priority: 1 # 1 now, 2 next, 3 later
size: M # S | M | L, optional, default M
status: open # open | claimed | in-pr | merged (on main, not yet seen in the game) | done (seen in the game by a second session, or closed by the CTO) | dropped | blocked
standard: 2
claimed-by: # branch name
branch: # the item's branch, recorded by `next` and kept when a claim is released; optional
pr: # #4387
after: # item ids (comma-separated) that must be merged before this can be built; present, may be empty
blocked-on: # another item's id, or an owner decision; present, may be empty
lead: laws # the role that owns it; required
model: sonnet # haiku | sonnet | opus | fable: the least capable model that can build it from the item alone
effort: medium # low | medium | high
root: rc8-law-judged-by-paperwork # an id from docs/pool/roots.md, or none
milestone: M3 # from docs/ROADMAP.md, if any
source: overnight order Session A; stopgap SG-GOV-REACH-A-cannabis
---

**What.** One paragraph: what to build or fix, in plain words. Seen: the shelf price on a retailer's card after the cannabis law passes.

**Cause.** Begins with exactly one of: `Found in code:` (a repository path that exists, with a line number or a function name), `Measured:` (a place and a seed, or the command that shows it), `Design:` (for work that is new, not broken: a path under docs/ that exists, or a dated owner ruling), or `Needs cause.` (nothing is known yet; say what was looked at).

**Fix.** What to change, in plain words. For `Needs cause.` it reads `None until the cause is found.`

**Time box.** Hours for one session of the model named in `model:` (owner, Oct 26: every assignment is SMART, `.agents/rules/smart-and-look-first.md`). When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** The owner rulings and AGENTS.md rules that bind this item, by name (no dice; an effect is a read; one rule, all 56 places; the chain is the acceptance).

**Done when.** What a second session sees in the running game, in a drawn place, by record where it can: which screen, which record id, which test or guard proves it. An item that asks the owner anything carries the reading line (`Read: OWNER-DECISIONS (...), DECISION-REGISTER, prior-rulings/..., LAW; searched: ...`).

**Waits on.** `Nothing.`, or the items or rulings it waits for (the same as `after:` and `blocked-on:`, in words).

**Files.** The engine files it touches. Every path exists, unless followed by ` (new)`.

**Notes.** Where it came from, what was tried, what the last session left (PR, branch, comment). Optional, and after the sections above.
```

**What** ends with one sentence that says where the player sees it: `Seen:` and the screen, scene, line, number or choice ("Seen: the bill card's line for who the law reached, in dollars."); `Feeds:` and the id of the item it is a step toward (that item must say where it is seen); or, for a rule, a check, a skill or a pool tool, `Guards:` and the thing the player sees or feels that it keeps working (a guard that protects only another unseen piece is not filed; the check wants at least four words after `Seen:` and `Guards:`, and the lead reads the line). The check holds every open, claimed, blocked or in-PR item to it (an item whose `checked:` is `fable 2026-11-10` is let through until the depth sweep, `docs/pool/DEPTH-SWEEP.md`, reaches it), and `Feeds:` must name a real item. `npm run pool -- add` takes the sentence as `--seen "Seen: ..."`. `npm run pool -- --check` names each thing a `standard: 2` item lacks. **A `Needs cause.` item is not built:** `claim` refuses it, and the index lists it under "Needs cause" and keeps it out of Next up, until Fable (or a session that finds the cause) rewrites it with `Found in code:` or `Measured:`. `npm run pool -- audit [--out <file>]` writes one JSON row for every open, gated and blocked item (at the standard or not, what it lacks, paths and names it cites that no longer exist, lead, size, last change); it changes nothing.

Keep the body short; the rules and checks are usually one line each because AGENTS.md carries the detail. An item needs no instructions that AGENTS.md already gives.

### What a priority 1 or 2 item must say

`npm run pool -- --check` fails an open or claimed priority 1 or 2 item unless: **What** has at least 3 sentences and 40 words; **Rules** names a standing rule from AGENTS.md (No dice, Wire to the world, An effect is a read, Ask why and the rest) with at least 6 words after it saying how it applies; **Done when** has at least 25 words and names a drawn place, the played world, a record id, `buildBenchWorld`, a test or a screenshot; **Files** names at least one path. Done when must not cite a PR number: an item that waits on a PR carries `after:` or `blocked-on:` instead. Priority 3 items are exempt. `npm run pool` prints the same problems as warnings.

## What goes in

- Every open PR that is not merged: one item saying what finishes it.
- Every unfinished line of every work order (`docs/work-orders/*`), every "Needs from other sessions" line in `docs/coordination/*.md`, every unchecked checklist line there.
- Every bug: a failing test on `main`, a defect a batch or an audit found, anything the owner saw in play.
- Every open stopgap, grouped by engine (one item per engine and kind, naming its rows), not one item per row.
- Every owner decision still open (`kind: owner-decision`, `status: blocked`): the question, in one line, so the CTO can bring the list to him.
- Roadmap work not yet started (`docs/ROADMAP.md` M2 to M7, `docs/roadmap/later-specs-draft.md`), one item per spec, priority 3 until scheduled.

## What stays out

Rulings (they live in `OWNER-DECISIONS.md` and the register), status narrative (the PR body and the item's Notes), and anything already merged.

# Find a cause

Owner, Nov 10, 2026: "I don't want any work to be done unless Fable found the fix." An item whose Cause says `Needs cause.` is never built. This page is for a session, on any model or tool, that is asked to find the cause of one such item. It finds the cause, rewrites the item to the standard and opens a pull request that changes pool files only. It builds no fix. The lead (Fable, or whoever started you) then checks the cause against the code and sets `checked:`.

Whoever starts you names three things: the item's id, your branch, and your time box in hours. They may also name a session to message when you finish.

## Before you start

1. Work in a checkout of the repository. In a cloud container, run `npm install` once (never `npm ci`), and run every npm, npx or node command with `OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14"` and `NODE_OPTIONS=--max-old-space-size=8192` set. On the owner's Mac, read `.agents/rules/storage-and-workspaces.md` first.
2. Read, on main: `AGENTS.md` (all of "Standing owner rules" and "Process"), `.agents/rules/pool-item-standard.md`, the item (`docs/pool/items/<id>.md`) with every one of its Notes, each skill the item's Rules name (plain markdown under `.agents/skills/<name>/SKILL.md`), and the skills `heavy-runs` and `ask-why`.
3. Make your branch from main: `git fetch origin main && git checkout -B <branch> origin/main`.

## The steps

1. **Reproduce** what the item says, on current main, with the place and seed it names. One heavy run at a time, with long output sent to a file, never through `tail`. If it does not reproduce on the item's seed and on one fresh draw, that is your finding: say so with the commands and what they printed.
2. **Trace it.** The item's Time box and Notes say what to print first. Follow the one record or figure, by record id, to the file and line where it first goes wrong, and say why it goes wrong there. A symptom is not a cause. Where it is cheap, prove the cause with a probe: change the suspected line in your working copy only, see the symptom move, then undo it. Never commit a probe.
3. **Rewrite the item** to the standard:
   - **Cause.** begins `Found in code:` (a path that exists, with a line number or a function name) or `Measured:` (a place and seed, or the command that shows it), and names the record ids you followed.
   - **Fix.** says in plain words what to change, so a builder can build it from the item alone. It names the existing function it changes (owner, Nov 10: one money system, and reuse before you build). Money moves only through the accounts and obligations, the treasuries, withholding and the one benefit payer that exist; a Fix never adds a second payment, tax or ledger path beside one that exists, and a Fix that does is sent back.
   - `model:` and `effort:` name the least capable model that can build that fix, and **Time box.** names its hours.
   - **Done when.** says what a second session sees, and keeps the words "second session". **Waits on.** and **Files.** are true: every path exists, or ends with ` (new)`.
   - Keep the earlier Notes. Add one Notes paragraph with the date, what you ran, and what is still unknown.
   - Do not set or change `checked:`. The lead checks your cause against the code and sets it.
   - If the item is a duplicate of another, or should be split, say so in the pull request and leave that to the lead.
4. **Check it.** `npm run pool -- --check` shows nothing new against main, and prettier passes on the item's file. A note needs no release note of its own.
5. **Commit it to the hour's bundle, not to a pull request of your own** (owner, Nov 11; skill `pool-notes`). Commit the one item file to the hour's own branch, `pool/notes-<date>-<hour>` (named for the hour it closes in UTC; the skill says how to create it when it is not there yet), through GitHub's contents API, one item per commit, with the message `pool: <item id>: cause and fix written in`. The item stays open, because nothing was built: never set its status to merged, and never open a pull request whose first line is `Pool item:` for a cause (the merge reads that as "this builds the item"; three items were lost that way for twenty minutes on Nov 10). If the commit is refused because the file changed, read it again from the hour's branch and commit on top.
6. **Say what you found** on the crew's issue, or to whoever started you if they named a session: `noted <item id> <the commit's full sha>`, then the cause in two or three sentences: the record id, the file and function, the place and seed, and the probe that showed it. Plain American English, short sentences, no model names (skill `civic-reports`). Give every money figure in dollars, and say so once: the journal keeps cents, and a figure copied from it unconverted is a hundred times too large. The lead reads the cause against the code before the hour's bundle merges; a cause nobody has checked must not reach main, because the item is offered to builders the moment it does.

## When the time box runs out with no cause

Commit the item all the same. The item keeps `Needs cause.`, and its new Notes paragraph says what you ruled out, by file and line, and what to print next. That is a result: the next finder starts from it.

## A sweep: is each red still red?

Many `Needs cause.` items are tests that were red on some draw weeks ago. Before anyone traces one, a sweep finds out which are still red. Whoever starts you names the list of item ids, your branch and your time box.

1. For each item, in the order given: read it, and run exactly the command and seed it names on current main, one at a time, with its output sent to a file. Give one run at most 30 minutes. An item that names no command is skipped, and its note says so.
2. Do not trace anything. A sweep only says green or red.
3. Add one Notes paragraph to the item: `**Notes (re-run, <date>, main <first ten characters of the commit>).**` then the command, the place and seed, and the result. For a red, quote the first failing assertion as printed. For a green on the item's own seed, run one fresh draw too and name its place and seed; if both are green, end the note with "Proposed for the CTO: drop as fixed on main." Change nothing else in the item: its Cause stays `Needs cause.`
4. Commit and push after every five items, so the work survives a session that ends.
5. Each item's note is one commit on the hour's bundle (skill `pool-notes`), not a pull request of your own. When the list is done, post one table on the crew's issue: item, still red or green, place and seed, and the first failing assertion for each red.
6. Tell whoever started you when the list is done, with the counts of red and green.

## What you never do

- Change game code or tests in this pull request. It holds pool files and the release note only.
- Build the fix, or merge anything.
- Post on issue 8928. Your pull request is your thread.
- Force-push, weaken a test, or leave a probe in a commit.
- Name a place in a Fix as a rule. A named place is a labeled case for a test.
- Write a line under `data/english/parts/`, or put the game's title where outsiders can see it.

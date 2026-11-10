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
   - **Fix.** says in plain words what to change, so a builder can build it from the item alone.
   - `model:` and `effort:` name the least capable model that can build that fix, and **Time box.** names its hours.
   - **Done when.** says what a second session sees, and keeps the words "second session". **Waits on.** and **Files.** are true: every path exists, or ends with ` (new)`.
   - Keep the earlier Notes. Add one Notes paragraph with the date, what you ran, and what is still unknown.
   - Do not set or change `checked:`. The lead checks your cause against the code and sets it.
   - If the item is a duplicate of another, or should be split, say so in the pull request and leave that to the lead.
4. **Check it.** `npm run pool -- --check` passes, and prettier passes on the files you changed. Add a release note, `docs/release/changes/<an id nobody has used>.md`, with frontmatter `id:` (the file name without `.md`) and `impact: none`, then one plain sentence. With `impact: none` it has no `section:` and no `title:`.
5. **Open the pull request,** ready and not a draft. The first line of its body is exactly:

   `Touches pool item: <id> (cause and fix written in; nothing built, so the item stays open).`

   Never write `Pool item:` there: the merge reads that as "this builds the item" and marks it merged (three items were lost that way for twenty minutes on Nov 10). Then four headings: `## What changed for the player` ("Nothing."), `## What I found` (the cause by record id, file and line, the place and seed, and the probe that showed it), `## Still unknown`, and `## Removed` ("Nothing."). Plain American English, short sentences, no model names (skill `civic-reports`).

6. **Tell whoever started you,** if they named a session: one message with the pull request number, its head commit and the cause in three sentences. Then stop.

## When the time box runs out with no cause

Open the pull request all the same. The item keeps `Needs cause.`, and its new Notes paragraph says what you ruled out, by file and line, and what to print next. That is a result: the next finder starts from it.

## A sweep: is each red still red?

Many `Needs cause.` items are tests that were red on some draw weeks ago. Before anyone traces one, a sweep finds out which are still red. Whoever starts you names the list of item ids, your branch and your time box.

1. For each item, in the order given: read it, and run exactly the command and seed it names on current main, one at a time, with its output sent to a file. Give one run at most 30 minutes. An item that names no command is skipped, and its note says so.
2. Do not trace anything. A sweep only says green or red.
3. Add one Notes paragraph to the item: `**Notes (re-run, <date>, main <first ten characters of the commit>).**` then the command, the place and seed, and the result. For a red, quote the first failing assertion as printed. For a green on the item's own seed, run one fresh draw too and name its place and seed; if both are green, end the note with "Proposed for the CTO: drop as fixed on main." Change nothing else in the item: its Cause stays `Needs cause.`
4. Commit and push after every five items, so the work survives a session that ends.
5. One pull request for the whole list, opened after the first push and kept up to date. The first line of its body is `Touches pool item: none (re-runs of red tests; notes only).` Under `## What I found` it has one table: item, still red or green, place and seed, and for a red the assertion in a few words.
6. Tell whoever started you when the list is done, with the pull request number and the counts of red and green.

## What you never do

- Change game code or tests in this pull request. It holds pool files and the release note only.
- Build the fix, or merge anything.
- Post on issue 7365. Your pull request is your thread.
- Force-push, weaken a test, or leave a probe in a commit.
- Name a place in a Fix as a rule. A named place is a labeled case for a test.
- Write a line under `data/english/parts/`, or put the game's title where outsiders can see it.

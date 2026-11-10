---
id: pool-next-by-model-and-a-pull-request-per-item
title: "One command gives any agent its next item by level, claims it and opens the item's own draft pull request"
area: docs
kind: feature
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: cto
model: opus
effort: medium
root: rc2-done-from-records
source: owner, Nov 10, 2026, through the CTO's 19:58Z and 20:01Z lines on issue 7365
checked: fable 2026-11-10
---

**What.** The owner wants one command he can paste into any agent, on any tool or account, so it takes the next right item, builds it and opens a pull request, then takes the next (owner, Nov 10: "it needs to be model agnostic ... picked up by codex, muse, etc. ... does it have weights on what should be done first? and i want it to be session proof"). The page the agent reads is docs/pool/START-A-BUILDER.md and the order is docs/pool/order.json; both are written. This item builds the tool they name: `npm run pool -- next`, `release`, the stale-claim release, the draft pull request made at the claim, and the index's Ready by model lists.

**Cause.** Found in code: scripts/pool/index.ts has no `next` or `release` command (`command`, line 676, handles reindex, claim, status, seen and add); `claim` (line 690) takes an id the agent must already have chosen, checks only the `after:` field and never the item's Waits on section, its model or `checked:`; `buildIndex` (line 227) orders Next up by priority, size, area and id (`order`, line 237) with no class, no count of what an item unblocks and no grouping by model; and nothing opens a pull request or releases a claim that has gone quiet.

**Fix.** All in scripts/pool/index.ts (split a file out beside it if it helps), with tests in scripts/pool/index.test.ts that use a temporary pool folder as the existing tests do.

1. **One order function,** exported, reading docs/pool/order.json: priority; then class (the first class in the file whose id prefix, root or milestone matches the item; an item matching none is last); then how many live items wait on it, more first (count items whose `after:`, `blocked-on:` or Waits on section names its id); then effort (low, medium, high); then size (S, M, L); then id. Within the stops-play class keep the play-first order the index uses today. Next up in the index uses this same function, replacing `order` and `nextUp`.
2. **Claimable** means all of: status open; `checked:` begins with `fable`; the cause is known (`needsCause` is false); every id in `after:` is on main (`gateOpen`); and the Waits on section either begins with "Nothing" or names only item ids that are all on main. A Waits on that names anything else (an owner decision, Story's lines, early-access preparation) is not claimable by `next`.
3. **`npm run pool -- next --model <haiku|sonnet|opus|fable> [--agent <name>] [--branch-prefix <prefix>] [--no-pr] [--dry-run]`.** Levels come from order.json. First release stale claims (step 5). Then take the first claimable item at the caller's level in the order; if none, the first at the next lower level, and so on; never one above. Claim it through the existing `claim` path on main (so two callers cannot take one item: the loser of the push race retries with the next item), with branch `<prefix><id>` where the prefix defaults to `pool/`, or the item's recorded `branch:` when it has one. Record `branch:` and, with `--agent`, add a Notes line naming the agent and the time. Then create the branch from origin/main if it does not exist on origin, with one commit adding docs/release/changes/<id>.md (frontmatter `id` and `impact: none`, and the one line "Not written yet: the builder replaces this line before the pull request is ready."), and push it. Then open the draft pull request (step 4). Print, in plain lines: the item id, its title, its file, the branch, the pull request number or the title and body file to open it with, and **continue** when the item already had a branch with commits beyond that first one. `--dry-run` prints what it would take and changes nothing. With no claimable item at or below the level, say so and exit 0.
4. **The draft pull request.** Title `<id>: <the item's title>`. Body written to a file under the system's temporary folder: line 1 `Pool item: <id>`; line 3 the gate line from .github/PULL_REQUEST_TEMPLATE.md with its blanks; then the template's sections with the Done when table already holding one row per sentence of the item's Done when and an empty evidence cell; then a section "The item as claimed" holding the item's What, Cause, Fix, Time box, Rules, Waits on and Files; then a section "How this pull request is used" with the five thread rules from docs/pool/START-A-BUILDER.md (progress, questions, send-backs, handoff, stale claims). Try `gh pr create --draft --head <branch> --base main --title ... --body-file ...`. If `gh` is missing or fails, print the title and the body file's path and the line telling the agent to open the draft itself and record it with `npm run pool -- claim <id> --branch <branch> --pr <number>`; make `claim` accept `--pr` on a claim the same branch already holds. When gh succeeds, record `pr:` on the item the same way.
5. **Stale claims.** For each item with status claimed whose `claimed-at` is older than twice its time box (the first number of hours in its Time box section; 4 when none), fetch its branch and read its newest commit's time; with no such branch use `claimed-at`. If that time is also older than twice the time box, set the item open, keep `branch:` and `pr:`, and add a Notes line saying when it was released, why, and where to continue. Replace the README's 60-minute rule with this one.
6. **`npm run pool -- release <id> --reason "<sentence>"`** sets a claimed item open, keeps `branch:` and `pr:`, and adds the reason to Notes.
7. **`status <id> in-pr`** refuses while docs/release/changes/<id>.md on the item's branch still holds the placeholder line, when that file exists.
8. **The index** gains a section "Ready by model": for each level, the count of claimable items and the first 15 in the order, so the owner can see how many agents of each level to start.
9. **Words.** Update docs/pool/README.md (Pick in order, Stale claims, and the Any agent prompt, which becomes the paste command in docs/pool/START-A-BUILDER.md) and add `branch` to the item file's documented fields. Make `validate` accept `branch:`. Add one line to AGENTS.md's pool bullet pointing a builder with no assignment at docs/pool/START-A-BUILDER.md, and run `npm run test:skill-ops`.

Change nothing else about claiming: a claim made the old way with `claim <id> --branch <any branch>` stays valid.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One writer for a claim: the push to main is the lock, as today. Replace, never layer: one order function serves `next`, Next up and Ready by model, and the old `order` and `nextUp` are deleted. Use only git, npm and `gh`; the tool must run for an agent that has no `gh` and for one that is not Claude. Never force-push. The index is main's alone (docs/pool/README.md): a branch never commits docs/pool/INDEX.md. Plain American English in everything the tool prints.

**Done when.** A second session, on main, runs `npm run pool -- next --model sonnet --dry-run` and `--model opus --dry-run` and sees each name an open, checked item at or below that level with a known cause that waits on nothing, the opus one an opus item while any is claimable. It runs `next --model haiku --agent check` for real in a scratch clone, sees the item claimed on main, the branch pushed with the release note's placeholder, and the draft pull request open with the item's sections in its body (or the printed title and body file where gh cannot open one), then runs `release` and sees the item open again with its branch and pull request kept. docs/pool/INDEX.md shows Ready by model with counts that match a count taken from the item files. This is a tool, so there is nothing to see in a drawn place of the game; the check is the tool's own behavior on main. The tool's tests pass, including: two callers racing for one item end with two different items; an item above the caller's level is never offered; a Waits on naming an unmerged item is not claimable; a claim quiet for twice its time box is released and offered as continue.

**Waits on.** Nothing.

**Files.** scripts/pool/index.ts, scripts/pool/index.test.ts, docs/pool/order.json, docs/pool/START-A-BUILDER.md, docs/pool/README.md, AGENTS.md, .github/PULL_REQUEST_TEMPLATE.md

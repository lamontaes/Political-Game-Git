---
name: session-start
description: >
  Runs the pool worker loop for Our Civic Duty: opening checks, claiming the
  next pool item, building it to its done-when, checking the work against the
  merger's list before the PR, opening a ready PR and taking the next. Use
  first in every building session, cloud or local, Claude, Codex or any other
  agent.
---

# Session start: the pool worker loop

Copy this checklist and keep it current:

```
- [ ] Open: AGENTS.md, item, rulings, install, golden path
- [ ] Red main? claim release-main-red first
- [ ] Claim the top of Next up (or a sent-back item: use pr-fixer)
- [ ] Copy the item's done-when lines into a scratch list
- [ ] Build to the done-when, proven in a played world
- [ ] Self-check: every done-when line has evidence; break-it test; merge main
- [ ] Local gate on changed files
- [ ] Ready PR from the template, done-when table filled; item set in-pr
- [ ] Next item
```

## Open

1. Read `AGENTS.md`, `docs/pool/README.md`, the item file and its Notes, and the newest rulings at the top of `docs/coordination/OWNER-DECISIONS.md`.
2. In a cloud environment, set `OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14"` in every shell. Install with `npm install` (in a cloud container, `npm ci` is fine too). On the owner's Mac, follow "Workspaces and storage" in `AGENTS.md`.
3. Run `node --import tsx tests/golden-path/runner.mjs` before changing anything.
4. Read the latest release run on main: `gh api 'repos/lamontaes/Political-Game-Git/actions/workflows/release.yml/runs?branch=main&per_page=1'`. If its conclusion is `failure`, claim `release-main-red` and fix it at the root on its own PR first.

## Claim and build

1. Take the top of "Next up" in `docs/pool/INDEX.md`, or your own area's top item. Claim it: `npm run pool -- claim <id> --branch <branch>`. If it's already claimed, take the next. A claim older than 60 minutes with no pushed branch and no PR may be released and taken. Say so in the item's Notes.
2. An item whose Notes say "Sent back … (branch X)" is a fix, not a build: follow `pr-fixer`.
3. An L item: split it into S or M items with their own done-when before building, and mark the L item `blocked-on` them.
4. Copy every line of the item's **Done when** into a scratch list before writing code. Each line is a thing you will show, not a thing you will describe. Read every function, export and field you plan to use on current `origin/main` first; names change daily, and code written from memory of an older main is the most common unverified assumption.
5. Branch from `origin/main` and build to the done-when. Prove it in a played world (`played-world-proof`), in a place drawn from all 56, naming place, seed and record ids.
6. Register every shortcut as a stopgap. For an owner's call, register an `owner-decision` stopgap and ask under **OWNER DECISIONS NEEDED**. Add a pool item for anything you find that isn't yours.

## Self-check before the PR

Mergers send back most PRs for the same few reasons, and every model makes them, Claude included: a done-when line with no proof, a test that passes without checking anything, a release note that says less than the change does, and a conflict with main. Check your own work against that list now. The merger runs the same list (merger skill, "Morning check").

1. **Every done-when line has evidence.** Next to each line on your scratch list, write the evidence: the test name, the command and its result, the place and full seed, and the record ids. If the item says one year, the run advances 365 days, not 120 or 200. If it says a drawn place, the place comes from `drawPlace` over all 56, and a pinned seed may sit beside it only as a named repro. If it names two further places, there are two. A line you cannot fill means the item is not done; go to step 6.
2. **Break it, then watch the test fail.** For each new or changed test, undo the key line of your change (or return early from the new code) and run the test. It must fail. Restore the change and run it again; it must pass. A test that passes both ways checks nothing. Assert the witnessed case exists (`expect(checked.length).toBeGreaterThan(0)`), and draw again with bounded retries until it does. These patterns pass on an empty world:
   - every assertion inside `if (found)` or `if (x.length)`;
   - `>= 0`, or a loop over a set that can be empty;
   - a `continue` that can skip every case;
   - a fixture you built by hand standing in for the generated world.
3. **Never weaken a test to get green.** No skips, early returns, narrowed ranges, raised timeouts without a measured reason, or exemptions for the cases that fail. If an existing test fails, find out why.
4. **Claims match the diff.**
   - **The release declaration:** if any engine reads what you changed (a price, a payment, a choice, a count), the impact is `patch` or `minor`, not `none`. "No screen shows it" doesn't make it `none`.
   - **Check one fact:** at least one count, date or list in the title, body or release note against the data.
   - **Research values:** reopen the page. The quote must contain the number, and the URL must be the page you read. For an election, record the deciding round, which may be a runoff, not the first round.
5. **Rules the merger checks:**
   - Don't touch guard allowlists or skip lists to clear a red check.
   - A bank part's `shippable` flag matches the grade ledger (it plays unless the owner's grades reject it; owner, Oct 24), and only the Words session edits `data/english/`, `src/english/` or `src/director/`.
   - No state, city or GEOID in logic.
   - No record that nothing reads.
6. **If a line can't be met,** don't open the PR as done. Either keep building, or file what blocks you as its own pool item, set your item `blocked-on` it with one Notes line, and open the PR only for what it really finishes, under a separate item whose done-when matches.
7. **Merge main last.** Run `git merge origin/main` (plain merge), resolve conflicts keeping both sides' behavior, and rerun the checks on the merged result. Conflicts with main are the second most common send-back.

## Open the PR

1. Run the local gate on changed files (`local-gate`; `npm run agent:test-cadence` lists the commands).
2. Add a release declaration: `npm run release:declare -- <id>`. An `impact: none` file holds only `id` and `impact`. `patch` or `minor` also needs `section` and `title`.
3. Push with plain `git push -u origin <branch>`. Open the PR **ready for review** against main, following `.github/PULL_REQUEST_TEMPLATE.md`. Line 1 is exactly `Pool item: <id>`, with no backticks; the merge flips that item to done automatically. Fill the **Done when** table from your scratch list: one row per line of the item's done-when, each with its evidence.
4. `npm run pool -- status <id> in-pr --pr <N>`. Never edit an item's status inside your feature PR.
5. Take the next item. When a merger sends your PR back, fix it before starting anything new.

## Rules

- Never force-push, rebase or amend a pushed branch. A merged PR carries no new work; open a new branch.
- Workers don't message other sessions or start schedules: the PR body and the item's Notes are the channel. Lead sessions may run their own helpers (`AGENTS.md`, "Helpers").
- Treat a permission prompt as denied. Don't retry it; work around it or note it in the PR body.
- Out of usage or stopping: push what you have, set the item back to `open` with one Notes line saying where you stopped, and stop.

---
name: session-start
description: >
  Runs the pool worker loop for Our Civic Duty: opening checks, claiming the
  next pool item, building it to its done-when, opening a ready PR and taking
  the next. Use first in every building session, cloud or local, Claude, Codex
  or any other agent.
---

# Session start: the pool worker loop

Copy this checklist and keep it current:

```
- [ ] Open: AGENTS.md, item, rulings, install, golden path
- [ ] Red main? claim release-main-red first
- [ ] Claim the top of Next up (or a sent-back item: use pr-fixer)
- [ ] Build to the done-when, proven in a played world
- [ ] Local gate on changed files
- [ ] Ready PR from the template; item set in-pr
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
4. Branch from `origin/main` and build to the done-when. Prove it in a played world (`played-world-proof`), in a place drawn from all 56, naming place, seed and record ids.
5. Register every shortcut as a stopgap. For an owner's call, register an `owner-decision` stopgap and ask under **OWNER DECISIONS NEEDED**. Add a pool item for anything you find that isn't yours.

## Open the PR

1. Run the local gate on changed files (`local-gate`; `npm run agent:test-cadence` lists the commands).
2. Add a release declaration: `npm run release:declare -- <id>`. An `impact: none` file holds only `id` and `impact`. `patch` or `minor` also needs `section` and `title`.
3. Push with plain `git push -u origin <branch>`. Open the PR **ready for review** against main, following `.github/PULL_REQUEST_TEMPLATE.md`. Line 1 is exactly `Pool item: <id>`, with no backticks; the merge flips that item to done automatically.
4. `npm run pool -- status <id> in-pr --pr <N>`. Never edit an item's status inside your feature PR.
5. Take the next item. When a merger sends your PR back, fix it before starting anything new.

## Rules

- Never force-push, rebase or amend a pushed branch. A merged PR carries no new work; open a new branch.
- Workers don't message other sessions or start schedules: the PR body and the item's Notes are the channel. Lead sessions may run their own helpers (`AGENTS.md`, "Helpers").
- Treat a permission prompt as denied. Don't retry it; work around it or note it in the PR body.
- Out of usage or stopping: push what you have, set the item back to `open` with one Notes line saying where you stopped, and stop.

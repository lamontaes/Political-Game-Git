---
name: cto-gate-merge
description: >
  Gate and merge an Our Civic Duty pull request as Claude CTO: run the gate at
  the exact head, comment VALIDATED, merge with match-head-commit, and report it
  to Lamontae in plain patch-note words. Use whenever a team posts VALIDATED or a
  PR is ready.
---

# Gate and merge a PR (Claude CTO)

Repo: lamontaes/Political-Game-Git. Always pass `-R lamontaes/Political-Game-Git` to `gh`.

1. Gate at the current head, in the background for anything slow:
   `cd /Users/lamontae/political-game-play && zsh cto-notes/tools/gate.sh <N> > <scratchpad>/gate-<N>.log 2>&1`.
   It prints `#N <sha9> typecheck=0 release=0 tests=0 (...)`, or `CONFLICTS-with-main`.
   Several at once: `for n in A B C; do zsh cto-notes/tools/gate.sh $n; done`.
2. Before merging, re-read the head: `gh pr view N --json headRefOid --jq .headRefOid`. If it moved since the gate, look at the new commits (`git log <gated>..<new>`). Docs-only or research-staging commits can merge; code or data changes get re-gated.
3. Comment, mark ready, merge with the FULL sha (a short sha fails):
   `gh pr comment N --body "VALIDATED at <full sha> (Claude CTO): typecheck OK, release:check OK, changed tests pass. Merging."`,
   then `gh pr ready N`,
   then `gh pr merge N --merge --match-head-commit <full sha>`.
   A 504 from GitHub can still merge; check with `gh pr view N --json state`.
4. Conflicts: tell the owning team to merge main and push; don't force-push their branch. For small conflicts in your own PRs, merge main locally in a worktree (`git worktree add /tmp/wt-X origin/<branch>`, `ln -s /tmp/wt-backdrops/node_modules`).
5. On hold: `gh pr ready N --undo`, plus a comment saying why.
6. Report to Lamontae like patch notes: what the player sees or what the world does now, in plain words. The PR number is optional and never alone. Also list any placeholders the PR added (grep its diff for PLACEHOLDER).

Never merge the law stack or people-engine art without your own look. Never force-push, and never delete branches.

## Design check before EVERY merge (owner, Oct 1: "you are the only line of defense")
merge.sh runs `design_check.py <pr> "<text>"` on the PR diff and refuses:
- game code naming a specific law question or state code, unless the text has `Hardcode-ok: <why>`;
- new game-code files or exported functions, unless the text has `Replaces: <old path removed>`.
Before writing `Replaces:`, grep main for an existing helper that does the same job. If one exists, send the PR back to reuse it. Never merge a new path beside an old one; the PR must delete the path it replaces.

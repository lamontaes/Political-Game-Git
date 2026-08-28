# Git Worktrees and Takeovers

- separate active coding agents use separate worktrees;
- takeover source workspace is read-only;
- dirty work is salvaged through an inspectable patch plus explicitly reviewed untracked files;
- never clean/reset/stash another agent's tree;
- normal fast-forward publication only unless force-push is explicitly authorized;
- fetch/reverify remote head immediately before publishing;
- if the remote implementation branch unexpectedly moves, STOP rather than overwrite it;
- record workspace ownership in the handoff.

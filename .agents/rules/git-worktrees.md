# Workspaces, branches and takeovers

- **Workspace:** a cloud container is the session's workspace. On the owner's Mac, use the registered workspace (`npm run storage -- workspace --owner <owner>`) and never add a worktree or clone (see `storage-and-workspaces.md`).
- **One writer per branch.** Don't push to a branch another session is working on. Claiming a sent-back pool item transfers its branch to you (`pr-fixer`).
- **Takeover:** treat the previous session's workspace as read-only. Salvage dirty work as an inspectable patch plus reviewed untracked files. Never clean, reset or stash another agent's tree.
- **Publishing:** plain fast-forward pushes only; never force-push, rebase or amend a pushed branch. Fetch and re-check the remote head right before pushing. If the remote branch moved unexpectedly, stop rather than overwrite it.

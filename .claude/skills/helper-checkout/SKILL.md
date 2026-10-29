---
name: helper-checkout
description: >
  Gives a helper or sub-agent of Our Civic Duty a copy of the repository that
  holds only what its task needs: a sparse copy that shares the main checkout's
  git objects and links node_modules, made or narrowed with one command. Use
  whenever a session starts a helper, sub-agent or worktree, and whenever it
  finds a full helper copy on disk. Not for the main checkout itself, and not
  for the Mac's registered workspace (storage-and-workspaces).
---

# Helper checkout

**The rule (owner, Oct 29; `AGENTS.md`, "Helpers never copy the whole repository"):** "they shouldn't. They should immediately delete what they don't need, or even more helpfully, only clone what they do need"; "This needs to be a project rule." A full copy is about 3.3 GB: `art/` is 1.6 GB, and `docs/codex`, `docs/play-first`, `docs/mockups`, `docs/ui`, `docs/screens` and `docs/archive` add about half a gigabyte. Six helper worktrees and `.git` filled a cloud session's disk on Oct 29. Every write then failed, and one helper's checkout died partway. A sparse copy is about 1.2 GB with its edits, or 0.9 GB fresh.

## Start a helper

1. **Prefer a fresh sparse copy.** From the main checkout, before you brief the helper:
   `scripts/storage/helper-checkout.sh new <dir> <branch>`
   - `<dir>` is outside the main checkout: your scratchpad or `/home/user/<name>`. The script refuses a path inside it, because vitest and the source-identity hash in `vite.config.ts` read every untracked file there. Two false reds and a crashed config load on Oct 29 came from helper worktrees under `.claude/worktrees/`.
   - `<branch>` is checked out from the remote if it exists, so a fixer resumes a sent-back PR's branch; otherwise it starts from `origin/main`.
   - The copy shares the main checkout's objects (`git clone --shared`), so nothing is downloaded twice. It links the main checkout's `node_modules`; the helper never runs `npm install`.
   - `--keep <folder>` brings back a skipped folder the task needs: `art` for an art or people helper, `public` for a lane helper whose browser check serves it. A check that reads a skipped folder fails in a sparse copy for that reason alone: `npm run test:skill-ops` reads `art/people-engine/v2/README.md` (the asset skill's link), so a skills helper keeps `art` or leaves that one case to CI. `desktop/` is never skipped, because `vite.config.ts` imports from it and every test run needs it.
2. **Brief the helper to work only in `<dir>`**: `cd <dir>` first in every command, push its branch often, and never delete or move the copy. Start it without the agent tool's worktree option, since that option makes a full copy.
3. **If a full worktree already exists** (the agent tool's worktree option, an older helper, a clone), narrow it at once. Its edits and commits are kept:
   `scripts/storage/helper-checkout.sh narrow <dir>`

## When it ends

- The helper pushes its branch. A copy is disposable once its branch is on the remote: delete it only after `git -C <dir> status --short` is empty and `git -C <dir> log origin/<branch>..HEAD` shows nothing unpushed.
- Never run `git gc --prune=now` in the main checkout while a shared copy lives; the copies borrow its objects.

## Checks

- `du -sh --exclude=node_modules <dir>` stays near 1 GB.
- `git -C <dir> sparse-checkout list` starts with `/*`, then one `!/<folder>/` line per skipped folder.
- If `df -h /` shows little free space with low "Used", the session's allowance is spent: narrow every helper copy before deleting anything else.

## Stop condition

The skill ends when every helper's copy is sparse, outside the main checkout and on its own branch. Anything it cannot narrow (a copy another session owns) goes to that session or the CTO.

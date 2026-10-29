---
name: helper-checkout
description: >
  Gives a helper or sub-agent of Our Civic Duty a copy of the repository that
  holds only what its task needs: a sparse copy that skips image files, shares
  the main checkout's git objects and links node_modules, made or narrowed
  with one command. Use whenever a session starts a helper, sub-agent or
  worktree, and whenever it finds a full helper copy on disk. Not for the main
  checkout itself, and not for the Mac's registered workspace
  (storage-and-workspaces).
---

# Helper checkout

**The rule (owner, Oct 29; `AGENTS.md`, "Helpers never copy the whole repository"):** "they shouldn't. They should immediately delete what they don't need, or even more helpfully, only clone what they do need"; "This needs to be a project rule." A full copy is about 3.3 GB, and two thirds of it is images: 1.7 GB of png and 0.4 GB of jpg in `art/`, `docs/` and `public/`. Six full helper worktrees and `.git` filled a cloud session's disk on Oct 29. Every write then failed, and one helper's checkout died partway. A sparse copy is about 0.9 GB.

## Start a helper

1. **Make a fresh sparse copy** from the main checkout, before you brief the helper:
   `scripts/storage/helper-checkout.sh new <dir> <branch>`
   - It skips image files (png, jpg, jpeg, webp, gif, psd) everywhere and keeps every folder. Code, data, notes and JSON stay, so typecheck, the tests and the guards all run in the copy.
   - `<dir>` is outside the main checkout: your scratchpad or `/home/user/<name>`. The script refuses a path inside it, because vitest and the source-identity hash in `vite.config.ts` read every untracked file there. On Oct 29 helper worktrees under `.claude/worktrees/` gave false reds and a crashed config load.
   - `<branch>` is checked out from the remote if it exists, so a fixer resumes a sent-back PR's branch; otherwise it starts from `origin/main`.
   - The copy borrows the main checkout's git objects (`git clone --shared`) and links its `node_modules`. The helper never runs `npm install`, `git gc`, `git repack` or a bare `git fetch`; it fetches only `git fetch origin main` and its own branch. One helper's copy grew from 3 MB of `.git` to 2.6 GB after a fetch of everything.
   - `--keep-images` is for a helper whose task is the pictures themselves (art, people, screens).
2. **Brief the helper to work only in `<dir>`**: start every command with `cd <dir> &&`, push its branch often, and never delete or move the copy. Start it without the agent tool's worktree option, since that option makes a full copy.
3. **If a full worktree already exists** (the agent tool's worktree option, an older helper, a clone), narrow it at once. Its edits and commits are kept:
   `scripts/storage/helper-checkout.sh narrow <dir>`

## Checks in a sparse copy

- Typecheck, eslint, prettier, the vitest files and every guard ran in a sparse copy on Oct 29. `src/bench` and `scripts/dev-lab` import JSON from `art/`, `vite.config.ts` imports from `desktop/`, and the guards read code and notes under `art/` and `docs/`. That is why only images are skipped, never whole folders.
- A scanner that reads every tracked file skips the ones the copy does not hold. The English spelling guard and the secrets scan do this with `existsSync`; CI's full checkout still reads them all. A new scanner of `git ls-files` does the same.
- `du -sh --exclude=node_modules <dir>` stays near 0.9 GB, and `du -sh <dir>/.git` stays in megabytes.

## When it ends

- A copy is disposable once its branch is on the remote: delete it only after `git -C <dir> status --short` is empty and `git -C <dir> log origin/<branch>..HEAD` shows nothing unpushed.
- Never run `git gc --prune=now` in the main checkout while a shared copy lives; the copies borrow its objects.
- If `df -h /` shows little free space with low "Used", the session's allowance is spent: narrow every helper copy before deleting anything else.

## Stop condition

The skill ends when every helper's copy is sparse, outside the main checkout and on its own branch. Anything it cannot narrow (a copy another session owns) goes to that session or the CTO.

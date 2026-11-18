---
name: helper-checkout
description: >
  Gives a helper or sub-agent a copy of the repository with only what its task
  needs: a sparse copy without image files, sharing the main checkout's git
  objects and linking node_modules, made or narrowed with one command. Use
  whenever a session starts a helper, sub-agent or worktree, or finds a full
  helper copy on disk. Not for the main checkout or the Mac's registered
  workspace (storage-and-workspaces).
---

# Helper checkout

**The rule (owner, Oct 29; `AGENTS.md`, "Helpers never copy the whole repository"):** "they shouldn't. They should immediately delete what they don't need, or even more helpfully, only clone what they do need"; "This needs to be a project rule." A full copy is about 3.3 GB, and two thirds of it is images: 1.7 GB of png and 0.4 GB of jpg in `art/`, `docs/` and `public/`. Six full helper worktrees and `.git` filled a cloud session's disk on Oct 29. Every write then failed, and one helper's checkout died partway. A sparse copy is about 0.9 GB.

## Start a helper

1. **Make a fresh sparse copy** from the main checkout, before you brief the helper:
   `scripts/storage/helper-checkout.sh new <dir> <branch>`
   - It skips image files (png, jpg, jpeg, webp, gif, psd) everywhere and keeps every folder. Code, data, notes and JSON stay, so typecheck, the tests and the guards all run in the copy.
   - `<dir>` is outside the main checkout: your scratchpad or `/home/user/<name>`. The script refuses a path inside it, because vitest and the source-identity hash in `vite.config.ts` read every untracked file there. On Oct 29 helper worktrees under `.claude/worktrees/<name>` gave false reds and a crashed config load.
   - `<branch>` is checked out from the remote if it exists, so a fixer resumes a sent-back PR's branch; otherwise it starts from `origin/main`.
   - The copy borrows the main checkout's git objects and links its `node_modules`. It is a `git clone --shared`, or a `git worktree add` when the main checkout is a shallow clone, as cloud checkouts can be. A clone of a shallow repository copies every pack instead of sharing them; the words session found a 3.7 GB copy that way on Oct 29, and a worktree shares the objects either way. The helper never runs `npm install`, `git gc`, `git repack` or a bare `git fetch`; it fetches only `git fetch origin main` and its own branch. One helper's copy grew from 3 MB of `.git` to 2.6 GB after a fetch of everything. A plain `git fetch origin <branch>` in a copy can leave `origin/<branch>` at an older commit, so merging `origin/<branch>` merges the wrong one without a word; merge the SHA from `git ls-remote origin <branch>` (Oct 30, speed lead: a combined copy silently missed two of three fixes).
   - `--keep-images` is for a helper whose task is the pictures themselves (art, people, screens).
2. **Brief the helper to work only in `<dir>`**: start every command with `cd <dir> &&`, push its branch often, and never delete or move the copy. Start it without your tool's own worktree option (in Claude, the Agent tool's worktree isolation), since that option makes a full copy. The script is plain shell, so a Codex, Muse or other session uses it the same way.
3. **If a full worktree already exists** (the agent tool's worktree option, an older helper, a clone), narrow it at once (a full copy from your tool's worktree option, an older helper, a clone). Its edits and commits are kept:
   `scripts/storage/helper-checkout.sh narrow <dir>`

## Checks in a sparse copy

- Typecheck, eslint, prettier, the vitest files and every guard ran in a sparse copy on Oct 29. `src/bench` and `scripts/dev-lab` import JSON from `art/`, `vite.config.ts` imports from `desktop/`, and the guards read code and notes under `art/` and `docs/`. That is why only images are skipped, never whole folders.
- A scanner that reads every tracked file skips the ones the copy does not hold. The English spelling guard and the secrets scan do this with `existsSync`; CI's full checkout still reads them all. A new scanner of `git ls-files` does the same.
- `du -sh --exclude=node_modules <dir>` stays near 0.9 GB, and `du -sh <dir>/.git` stays in megabytes.
- **Leave out image files, never the `art/` folder.** A copy made with a rule that drops `art/` whole fails every test that reads a manifest there (`ENOENT ... art/busts/v1/manifest.json`, Nov 11). The rule is by extension: `'/*' '!*.png' '!*.jpg' '!*.jpeg' '!*.webp' '!*.gif'`.
- **A pull request that moves or adds pictures is built in a copy that has them.** `git add` refuses a path the sparse rule leaves out; `git add --sparse <path>` adds it, and `git mv` of pictures wants the full copy.
- Anything that draws a person reads a picture, and the copy has none. `src/bench/path-check.ts` and the bench tests print their whole log and then exit 1 on a people-pack `ENOENT` for a `.png` (Nov 1, governing lead). Read the log rather than the exit code, or make the copy with `--keep-images` when the exit code matters.

- **`helper-checkout.sh new <dir> <branch>` can leave the local branch on an old commit (Nov 12, Fixer F2).** One copy (for #8222) came up on a merge commit of another branch, not the pull request's head, so `git merge origin/main` merged the wrong tree and looked clean. Right after making a copy run `git fetch origin main <branch>`, then `git reset --hard -q origin/<branch>` (the copy is new, so nothing is lost), and check `git log -1 --oneline` against the head the pull request names before merging main.

## When it ends

- A copy is disposable once its branch is on the remote: delete it only after `git -C <dir> status --short` is empty and `git -C <dir> log origin/<branch>..HEAD` shows nothing unpushed. A clone copy is removed with `rm -rf <dir>`; a worktree copy (its `.git` is a one-line file) with `git worktree remove <dir>` from the main checkout.
- When disk is short, reuse a finished copy for the next helper instead of making another. Check that `git -C <dir> status --short` is empty and that nothing is unpushed, then run `git -C <dir> checkout -B <new-branch> origin/main` (Nov 1, governing lead: ten copies of about 0.9 GB each on a 6 GB allowance).
- Never run `git gc --prune=now` in the main checkout while a shared copy lives; the copies borrow its objects.
- **Never check out, `checkout -B` or `reset` a branch another copy has checked out (Long game, Nov 17).** Worktree copies share one set of branch refs, so `git checkout -B <branch>` in a helper moved that branch under the main checkout, which then showed the merge backwards as uncommitted changes. Before reusing a copy for a branch, run `git worktree list`; if another copy holds the branch, work there or detach this one first. To recover, `git switch --detach <commit>` in the copy whose files already match that commit, which leaves its tree clean without a reset.
- If `df -h /` shows little free space with low "Used", the session's allowance is spent: narrow every helper copy before deleting anything else.

- **One heavy run per machine, not per helper (Nov 17, Story lead).** Five helpers each running "one heavy command at a time" put eleven node processes and 11 GB on a 15 GB machine; a 6 GB scene-samples run and a 12-seed trace were killed (exit 137). The lead's brief sets the ceiling: name which helpers may run a world build at the same time, give trace scripts `--max-old-space-size=4096`, and check `free -g` before starting a run of your own. A run killed this way prints nothing; look for "Killed" in the task output.

## Stop condition

The skill ends when every helper's copy is sparse, outside the main checkout and on its own branch. Anything it cannot narrow (a copy another session owns) goes to that session or the CTO.

- **A helper copy is removed the hour its pull request is ready or stamped (Story lead, Nov 17).** Twenty-four sparse copies at 776 MB each filled a 252 GB session to 97 percent and Chrome stopped taking screenshots. Keep only the copies of branches still being built or that another branch stacks on; remove the rest with `git worktree remove --force <path>` (or `rm -rf` and `git worktree prune`) after `git status --porcelain | grep -v '^??'` shows nothing uncommitted. A removed copy costs one `helper-checkout.sh new` to bring back.

## Gotchas

- Nov 18 (Story): the helper copies are worktrees of one repository, and `git checkout -B` lets two of them hold the same branch. A commit in one moves the branch for both, and the other's files fall behind its HEAD; `git add -A` there then re-adds the stale tree as changes (99 files undone in one commit on #10063). One branch per worktree: check `git worktree list` before `checkout -B`, and detach the copy you leave.

---
name: project-operations
description: >
  Preflight, resume, recover, take over, or hand off Political Game repository
  work with exact workspace/branch/SHA ownership. Use for session starts,
  interrupted work, dirty-worktree recovery, ownership transfer, or handoff;
  do not use as a substitute for an implementation plan or routine Git status.
---

# Project operations

Use the existing workflows; this skill does not replace them.

## Select the path

- New work or first action in a session: read `.agents/workflows/pg-preflight.md`.
- Resume an existing branch or PR: also read `.agents/workflows/pg-resume.md`.
- Recover or take over stopped work: read `.agents/rules/git-worktrees.md`, then
  use the recovery rules below.
- Pause or transfer work: read `.agents/workflows/pg-handoff.md`.

Root `AGENTS.md` and `CLAUDE.md` remain authoritative. Read the owning packet and
active plan rather than reconstructing authorization from historical evidence.

## Bounded workflow

1. Run `npm run agent:preflight`. Fetch the relevant remote refs, then record the
   absolute workspace, branch, local HEAD, upstream ref/SHA, dirty tracked files,
   untracked files, and worktree ownership.
2. Stop if the workspace, branch, PR, or active writer is ambiguous. A task that
   is idle or stalled may still own a worktree.
3. For a takeover, treat the source worktree as read-only. Compare remote heads,
   local refs, the owning plan, and actual dirty/untracked files. Never stash,
   reset, clean, or force-push to simplify recovery.
4. If unpublished work must move, save a bounded binary-capable patch plus only
   explicitly reviewed untracked project files, with a manifest and hashes, then
   replay them in the recipient's isolated worktree. Preserve the source.
5. Before publication, fetch again and verify the expected remote head and sole
   ownership. Reconcile normally; stop on unexpected movement. Never infer a PR
   number or use a GUI footer as branch proof.
6. Hand off with every field required by `pg-handoff.md`, including tests actually
   run, remaining defects, acceptance state, and a small LEARN note.

## Delegation boundary

Plan zero helpers by default. Delegate only an independently useful deliverable
when the user or applicable project/skill instructions authorize it. Record the
input/head, allowed paths and tools, expected output, model/effort when overridden,
and independent-work/resource rationale. Prefer read-only helpers. Helpers do not
spawn helpers; the parent integrates and verifies. Do not commission redundant
whole-repository reviews.

## Stop condition

Stop when ownership or exact state cannot be established, recovery would omit or
overwrite unpublished work, the remote moved unexpectedly, or new authority is
needed. Report the precise blocker instead of silently reconstructing state.

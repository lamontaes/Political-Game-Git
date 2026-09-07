# PG Resume Workflow

- read root `CLAUDE.md` and `AGENTS.md` first, then the canonical Drive chain
  and the owning plan under `docs/plans/` for continuation state;
- fetch origin;
- verify expected SHA ancestry;
- confirm intended worktree and branch;
- confirm no competing agent owns the same implementation lineage;
- inspect dirty/untracked state;
- run appropriate focused smoke tests before editing;
- stop rather than silently reconstruct missing state.

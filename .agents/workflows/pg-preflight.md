# PG Preflight Workflow

1. run `npm run agent:preflight`;
2. read `AGENTS.md`;
3. read `docs/agent/ACTIVE-HANDOFF.md` if present;
4. fetch origin;
5. identify:
   - absolute workspace;
   - branch;
   - local HEAD;
   - upstream ref/SHA;
   - dirty tracked state;
   - untracked state;
   - worktrees;
6. identify whether another worktree is using the same implementation branch;
7. identify the intended dev-server process/port where practical;
8. STOP on ambiguous workspace or branch ownership.

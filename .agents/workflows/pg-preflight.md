# PG Preflight Workflow

1. Run `npm run agent:preflight`.
2. Read `AGENTS.md` once, then your pool item and its Notes. Open `.agents/rules/repository-reference.md` only when you need commands or art constraints.
3. Fetch origin.
4. Identify the absolute workspace, branch, local HEAD, upstream ref and SHA, dirty and untracked state.
5. Check whether another session is working on the same branch (the item's `claimed-by`, open PRs on it).
6. Stop on ambiguous workspace or branch ownership, and say so in the item's Notes.

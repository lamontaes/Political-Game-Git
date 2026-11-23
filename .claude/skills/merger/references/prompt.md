# Merger: the prompt

Part of the `merger` skill. The paste prompt that starts a merger.

## The prompt

> Read AGENTS.md and .agents/skills/merger/SKILL.md in lamontaes/Political-Game-Git, then docs/coordination/MERGE-FIRST.md and the CTO section of docs/coordination/LEADS-2026-10-24.md.
> You are merger <N>: your share is open PRs whose number mod <M> equals <N> (<M> = the number of share mergers running) (the recheck merger's share is the recheck list in MERGE-FIRST.md), <oldest | newest> first, after every MERGE-FIRST line you can take. Start every comment with "Merger <N>:".
> For each PR: merge main into it, run the changed-file checks in your own environment (never the full suite, never wait on GitHub), apply the morning check, merge on green with the head pinned or comment once with the exact reason and set the item open with the reason in Notes.
> Play-first lane PRs first; send one back only for missing before/after screenshots, never for director or English edits or lines the grade ledger lets play. "OWNER SCREENSHOT NEEDED" is not a merge gate; a `docs/play-first/PROGRESS.md` hunk on a lane branch is dropped, not resolved.
> Rules, checks and skills merge first (owner, Nov 10). Never merge a PR you authored, never force-push, never run the full suite. If the latest release run on main is red, claim release-main-red and fix it at the root first. End with a table.
> In a cloud environment, set OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" on every npm command and never ask the owner to confirm it.

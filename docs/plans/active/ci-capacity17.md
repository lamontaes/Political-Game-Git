# CI-CAPACITY17 — make full validation finish reliably

Authority: Drive packet
`1kvuCvrVtlKnU4ogKdXfWmhwC_22ZJOYMkXnXD6_6lwY`. Isolated branch
`cursor/ci-capacity17-20b1` cut from `origin/main` `8176fc26`. LAND is the
sole main merger. The instruction-cleanup worker owns AGENTS/CLAUDE.

1. Preserve LAND's already-landed 75-minute browser job budget (164/166). Do
   not reopen those PRs. UI branches still on 45 minutes are a branch
   difference, not a reason to lower main.
2. Split repository validation from Playwright. Two native file-level shards.
   Keep `fullyParallel: false`. Do not rerun unit/source/art on browser shards.
3. Keep the required check named `validate`. It is green only when every
   mandatory job succeeded. Unique `PG_RUN_ID` and `test-results/runs/<id>`
   evidence per shard. Union of enumerated tests must equal the baseline list.

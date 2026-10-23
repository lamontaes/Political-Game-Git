# Merge first (CTO's list; mergers read this before their share)

Current as of 2026-10-23 (first version)

1. #5843 pool flips stop being cancelled (concurrency fix) — the pool stays honest only after this.
2. #5844 docs current + freshness skill — every session reads these; the merger skill you follow is in it.
3. #5649, #5589, #5639, #5582, #5080, #5320 — fixed send-backs waiting on a recheck since Oct 21; recheck at the current head.
4. #4459 Words engine part one — open since Oct 15; the Words stack (#4626, #5358) waits on it. If it still conflicts, comment once and leave it for the Words session; do not hand-merge banks.
5. #5832, #5833 — old-core deletion steps 01 and typecheck; the whole chain waits.
6. #5834 — dense-town year speed fix (p1).

When a line is merged or sent back, it stays until the CTO removes it; comment `Merge-first: <PR> done` on the PR.

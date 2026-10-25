# Merge first (CTO's list; mergers read this before their share)

Current as of 2026-10-25, 17:40 UTC

Rules that hold for every line: a PR whose line 1 names a `play-stop-*` item keeps that item as its line-1 item even when the fix was re-lined to a new item; the play-stop is the gate, and its done-when (a screenshot on the installed build, or the bench at 1440×900 with place and seed named until a build exists) stands. A lane PR with director or English edits carries `Review: words` and is never sent back for them. Held-to-shippable changes in data/english are the owner's Oct 24 ruling, never a send-back reason. One head per recheck: a lead never pushes while a merger is checking.

1. #6049 — done (merged 8d0dd8f295; the desktop package heap).
2. #5963 — done (merged 24dcd468a3; the play-first lane).
3. #5971 (play-stop-23; Merger 3 rechecks its current head now; the #6050 port splits out once #6050 merges).
4. #6041 (play-stop-22)
5. #6037 (play-stop-09)
6. #6038 (play-stop-08)
7. #6058
8. #6059
9. #6051
10. #6052
11. #6047
12. #6046
13. #5358 (words: the director names each line's move)
14. The rechecks, in this order: #6021 (after its src/simulation test moves to core2 or is dropped), #5657, #6025, #6009, #5980, #5804, #5875.
15. The rest, newest play-stop or play-first PR first (#6062 when it leaves draft), then the leads' queues as they post them.

#5956 stays open as the record; do not merge it (items are on main).

When a line is merged or sent back, it stays until the CTO removes it; comment `Merge-first: <PR> done` on the PR.

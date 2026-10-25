# Merge first (CTO's list; mergers read this before their share)

Current as of 2026-10-25, 23:50 UTC

Rules that hold for every line: a PR whose line 1 names a `play-stop-*` item keeps that item as its line-1 item even when the fix was re-lined to a new item; the play-stop is the gate, and its done-when (a screenshot on the installed build, or the bench at 1440×900 with place and seed named until a build exists) stands. A plain link to the PNG on the PR's branch satisfies the screenshot rule; open it (acting CTO, Oct 25). A lane PR with director or English edits carries `Review: words` and is never sent back for them. Held-to-shippable changes in data/english are the owner's Oct 24 ruling, never a send-back reason. One head per recheck: a lead never pushes while a merger is checking. **A merger never leaves a PR because another merger sent it back earlier; it rechecks the current head.**

1. **#6119 — red main.** The lane's shared files need no declaration. Any merger merges this first.
2. The lane PRs, in this order: #6058, #6091, #6092, #6086, #6104, #6101, #6069, #6088, #6097, #6105, #6118.
3. Traits: #5587, #5715 (ready since 17:48 and 18:12, no merger reply), then #5657 after its import fix (voting.ts:63).
4. Effects, never touched by a merger: #6042, #5912, #6045, #5661; then the rechecks #6008, #6020.
5. Laws: #5649, #6012, #5986, once the laws lead answers the merger's send-backs on each (not before).
6. The dead-ends #6062, #6041, #5971, when their lane agent says ready for recheck.
7. Ready, no reply for more than two hours: #5475, #5818, #5792, #5767, #5975, #6011, #5977, #6002, #6007, #5972, #5991, #6079, #5998.
8. The rest, newest play-stop or play-first PR first, then the leads' queues as they post them.

#5956 stays open as the record; do not merge it (items are on main).

When a line is merged or sent back, it stays until the CTO removes it; comment `Merge-first: <PR> done` on the PR.

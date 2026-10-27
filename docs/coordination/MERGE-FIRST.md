# Merge first (CTO's list; mergers read this before their share)

Current as of 2026-10-27, 01:05 UTC (CTO, on main)

Rules that hold for every line (`.agents/rules/smart-and-look-first.md`, owner Oct 26): you are not the session that wrote the PR, and that is all "adversarial" means. Run the changed-file checks on the merged result and try once to break the claim on another drawn place or seed. A PR whose **OWNER DECISIONS NEEDED** lacks the reading line, or whose new faked-mechanic or missing-mechanic stopgap has no code marker, goes back. Every send-back you write is SMART: the one defect, the check that shows it fixed, a time box. Rulings of Oct 25 still hold: "OWNER SCREENSHOT NEEDED" is not a merge gate; a lane branch's `docs/play-first/PROGRESS.md` hunk is dropped, not resolved; one head per recheck; a merger never leaves a PR because another merger sent it back earlier. Election day as a choice, discrimination yes, and Developer ID or licenses are never send-back reasons or open questions (`OWNER-DECISIONS.md`, Oct 26).

Mergers are numbered 0 to N-1 by PR number mod N, where N is the count the CTO started (five or six). Any merger takes any line here regardless of its share.

0. **Red main: #6202** (the desktop packaging step fails on every Release run since 20:09 UTC Oct 26, so no build has reached the owner since v0.36.1). Any merger merges it the moment its checks are green, before anything else.
1. **The screens stack, each after the one under it:** #6100, #6187, #6188, #6189, #6191. These replace every hand-built control in `play.mjs` with parts under `src/bench/ui/`; a lane PR that writes its own button, row, card, tab, menu, toast or talk box after #6179 is a send-back (`screen-to-mock`).
2. **The words PRs on their posted heads:** #6096, #6104, #6146, #6112, #6136, #6156, then whatever the words lead posts next. A play item merged is not closed: add the Notes line `Merged <date> in PR #N; awaiting the owner's installed-build check`.
3. **Laws:** #5669 rights (ready for recheck at 38bd67222e), then #6026 health and #6011 housing one at a time as the lead posts each head; the lead re-merges main after each merge.
4. **Traits:** #5657 (civic), then #6143 on it. #5715 merged.
5. **Speed:** #6074, #6133. After them, one Sonnet job measures `npm run speed:year` on main three times in a drawn town and writes the number to the speed section of the channel.
6. **Ready with no reply for more than two hours:** #5975, #5977, #6002, #6007, #5792, #5767, #5972, #5934 (fixer's head).
7. **Stale:** any open PR with no push for five days that is conflicted or sent back is closed with the comment `Merge-first: stale, back to the pool` and its item set `open` with a one-line Note naming the branch. The fixers take those items in pool order.
8. The rest, newest `play-stop-*` or `play-first-*` PR first, then the leads' queues as they post them.

Drafts #5968 and #5675 (the laws proof and report) merge last, after line 3.

**For the screens lead:** `play-stop-39`, `-40`, `-44`, `-45` are on main now; claim them with `npm run pool -- claim`.

**For the laws-and-effects lead (relayed from the Oct 26 playtest):** the owner's H.R. 1 sat drafted a year because `src/bench/legislature.ts` (around lines 215-219, commit c53327dea, Oct 17) stopped calling `scheduleVote`, and the weekly floor in `world-legislating.ts` only takes bills filed at session open; its "year-end votes" header is stale. Your next deliverable after the family PRs is visible in play: every player bill scheduled, members file all session, the floor vote and the whip on screen, and your matrix row says on which screen a law shows ("wired is not seen", `wiring-audit`).

When a line is merged or sent back, it stays until the CTO removes it; comment `Merge-first: <PR> done` on the PR.

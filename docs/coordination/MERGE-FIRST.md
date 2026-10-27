# Merge first (CTO's list; mergers read this before their share)

Current as of 2026-10-27, 16:15 UTC (CTO, on main). Read this file again before every merge; a hold on line 0 binds every push to main, pool commits and channel blocks included.

Rules that hold for every line (`.agents/rules/smart-and-look-first.md`, owner Oct 26): you are not the session that wrote the PR, and that is all "adversarial" means. Run the changed-file checks on the merged result and try once to break the claim on another drawn place or seed. A PR whose **OWNER DECISIONS NEEDED** lacks the reading line, or whose new faked-mechanic or missing-mechanic stopgap has no code marker, goes back. Every send-back you write is SMART: the one defect, the check that shows it fixed, a time box. Rulings of Oct 25 still hold: "OWNER SCREENSHOT NEEDED" is not a merge gate; a lane branch's `docs/play-first/PROGRESS.md` hunk is dropped, not resolved; one head per recheck; a merger never leaves a PR because another merger sent it back earlier. Election day as a choice, discrimination yes, and Developer ID or licenses are never send-back reasons or open questions (`OWNER-DECISIONS.md`, Oct 26).

Mergers are numbered 0 to N-1 by PR number mod N, where N is the count the CTO started (five or six). Any merger takes any line here regardless of its share.

0. **No hold now.** Release v0.56.1 published at 15:40 UTC. The next release window is announced here, on this line, before it starts.

0a. **Playtest rule (owner, 12:15 PM Eastern Oct 27: "I want the English engine, the scenes and the UI stuff merged soon so I can make sense of a playtest"):** every words (`Lead: words`, branches `words/`, `fixer5/`), director (`Lead: director`, `claude/director-*`), screens and lane (`play-stop-*`, `play-first-*`, `fixer3/`, `lead: play-first`) PR merges ahead of every other line the moment it is green. Merger W (dedicated) takes them first; any other merger takes one when W has claimed another. The finisher session (Opus, "Finisher: English engine and scenes") opens superseding PRs for sent-back scene PRs; those count as words PRs. Current order: #6338 (red-main sweep fix), #6230, #6276, #6263, #6269, #6309, #6317, #6320, #6324, #6325, #6327, #6329, #6332, #6303, #6298, #6296, #6304, #6314, then the lane's #6340 (CTO report), then Lane 6's screens PRs as they open.

1. **Carried from the 14:00 UTC build list, what is still open:** #6226 (the legislature's weekly floor takes up every bill: the owner's H.R. 1; `Lead: laws-effects`), #6234 (the opening starts with the President's address), #6230 (the Journal opens with the family's past), #6229 (skin and clothes colors in the creator), #6222 (News opens as the paper), #6232 (one dev-mode start, play as any officeholder), #6213 (printed news in words), #6201 (the campaign season), #6223 (a grade reaches every piece sharing its pattern), #6189 and #6191 (talk box, panel head), #6100 (toasts; fails its browser check, screens lead fixing), #6208 (the filing counter talk), #6099 (Politics guide), the director's and researchers' scene PRs as they open (#6224, #6228, #6233 and later), and every new `play-stop-*`, `play-first-*`, `Lead: screens`, `Lead: words`, `Lead: director` PR newest first.
2. **Laws and traits:** #6011 housing (af98343312), then the traits refit on #6143's follow-up.
3. **Speed:** #6074, #6133.
4. **Ready with no reply for more than two hours:** #5975, #5977, #6002, #6007, #5767, #5972, #5934.
5. **Stale:** any open PR with no push for five days that is conflicted or sent back is closed with the comment `Merge-first: stale, back to the pool` and its item set `open` with a one-line Note naming the branch.
6. The rest, newest `play-stop-*` or `play-first-*` PR first, then the leads' queues as they post them.

Drafts #5968 and #5675 (the laws proof and report) merge last, after line 3.

**For the screens lead:** `play-stop-39`, `-40`, `-44`, `-45` are on main now; claim them with `npm run pool -- claim`.

**For the laws-and-effects lead (relayed from the Oct 26 playtest):** the owner's H.R. 1 sat drafted a year because `src/bench/legislature.ts` (around lines 215-219, commit c53327dea, Oct 17) stopped calling `scheduleVote`, and the weekly floor in `world-legislating.ts` only takes bills filed at session open; its "year-end votes" header is stale. Your next deliverable after the family PRs is visible in play: every player bill scheduled, members file all session, the floor vote and the whip on screen, and your matrix row says on which screen a law shows ("wired is not seen", `wiring-audit`).

When a line is merged or sent back, it stays until the CTO removes it; comment `Merge-first: <PR> done` on the PR.

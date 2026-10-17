# CTO handoff, Oct 16, 2026 (standing CTO to acting CTO)

Written at 19:30 UTC from two Sonnet surveys of main, the open PRs and the pool. Read with `.agents/skills/cto/SKILL.md`.

## Where we are

- **The fleet works.** 274 PRs merged since 22:35 UTC Oct 15: gov 46, core 40, words 19, world 15, play 14, director 14, laws 11, people 9, office 8. Builders claim, build, open, and the merger clears them. The pool and the gate are doing their job.
- **The pool index lags the merges.** 51 items point at a merged PR but still read `in-pr`, `open` or `blocked`; Next up shows three items already merged. Cause: mergers merging through REST without running `npm run pool -- status <id> done`. Fix: one helper pass to flip them, then make the merger prompt's done-step non-optional (it is written, it is being skipped).
- **103 open PRs.** 49 are from today and normal. 54 are older than a day. The old ones fall into three kinds: superseded play-UI PRs (#4296, #4298, #4305, #4320, #4321, #4322: close them, replacements merged), big stale carriers (#713, #3996, #4125, #4146, #4151, #4283: salvage what the pool doesn't already cover, then close), and near-duplicates (#4480 and #4608 are the same item; #4780 overlaps both almost file for file).
- **Main's release run is undecided** at head `ca0b6dfafe`; the previous run was canceled by the next push. #4796 fixes the ENOBUFS in release:apply and stops runs canceling each other. Merge it first.
- **Collision hot spots.** `src/core2/data/stopgaps.json` is touched by 22 open PRs; `press.ts`, `voting.ts`, `legislature.ts`, `state.ts` by 8 or 9 each. Every merge there conflicts. The merger must regenerate, never hand-resolve, and should merge the small ones before the big ones.
- **Golden path not reported.** PROGRESS.md reports features, not the furthest step a player reaches. Nobody has written "a player reaches step N" since Oct 15. That is the number the owner asked for.

## What the acting CTO does today, in order

1. Merge #4796 and #4782 (main-red fix; merger ready endpoint). Confirm the release run on main goes green.
2. One helper: flip the 51 lagging pool items to done (or open if sent back), regenerate the index, push to main. Then rebuild the pool page snapshot.
3. Two mergers on the 49 fresh PRs, split by number parity, small first. Each merge sets its item done.
4. One helper: close the six superseded play-UI PRs; list what #713, #3996, #4125, #4146, #4151 still carry that no merged PR or open item covers, add pool items for that, and close them. #4283 (7,930 art files) waits for the owner's word.
5. One checker session plays the evening build from a new game and reports the furthest golden-path step reached, with the stop and its record id. Put that number in PROGRESS.md.
6. Clear the ten `owner-decision` stopgaps in `stopgaps.json` that OWNER-DECISIONS.md already closed on Oct 15 (player-offered-post, trusts, town-districts, fill-in-outside-kin, demotion-days, town-size, ballot-stop, windows-package, player-eviction, business-books). The release build refuses while they stay open.

## Questions for the owner, plain

Already ruled, do not ask again: election tie by recorded lot; scene-setting lines may be authored; public-notice headings fine; player's household is evicted like anyone; an owner sees the books; state roll-call data calibrates party loyalty with no credit. AGENTS.md answers: recessions from causes only; no contract-award mechanic unless the Political Process has it; dual-office rule is an estimate.

Open, in the order they block play:

1. Does the character give the player's money to cause groups on its own while time advances? One run gave 71 gifts, $557. (core-player-autoplay-acts)
2. Can a candidate ask people beyond their own circle for money, and does being asked fill a counted person in? Today a small-town candidate raises nothing. (#4749, #4309)
3. Should the bill scene wait until the bill is on the floor, not while committee may still hold it? (#4763)
4. Who tells a person a law changed their money: the outlet head, the friend who retold it, or a reporter? (#4747)
5. Should the Politics screen list only chamber leaders and the player's own legislators, not every state legislator? (core-opening-key-people)
6. How soon may a body undo a law it just passed? Today a sliding reluctance. (SG-GOV-reconsideration-rule)
7. Confirm: reporters and outlet owners cannot hold office. Confirm: a person with no seat may ask a member to carry a bill. (CTO rulings awaiting your yes)
8. Should executive acts crowd out printed roll calls (40 down to 15)? (#4613)
9. Should an employer raise pay a little each month for an opening that stays unfilled? (#3996)
10. Does the federal budget multiplier differ by line, or one 1.2 on everything? (world.md)
11. Disasters: real FEMA records only, world conditions, or both; and after the records end, does the game keep its own weather record? (owner-disasters-in-play, #4599)
12. Do you want a crime engine, and when? (owner-crime-engine)
13. Do papers endorse candidates? (SG-PEOPLE-press-endorsements)
14. Is a teen boy indoors drawn with the youngest adult look, or not drawn? (people.md)
15. What do the stress and mood baselines mean to you? (owner-stress-mood-scale)
16. Is the law-reach pay floor a standing law, or the dev-mode salary base a one-time raise? (SG-PLAY-dev-public-salary-floor)
17. First simulated year against real 2020: judge all 12 months or only the later ones? (world.md)

## My opinion

The machine is right: pool, gate, claim-on-main, mergers, builders. Throughput is not the problem; 274 merges a day is more than enough. The three things that would make tomorrow better than today are bookkeeping that keeps up (step 2), closing the stale carriers so the collision count drops (step 4), and one number nobody is writing down: how far a player gets (step 5). Everything else is normal.

# State of the game

One page, kept by Lane 5 (engine and release). Every line names where it comes from; a line with no source is a defect. Updated Nov 3, 2026, 22:30 UTC.

## What a player can do now

- **Furthest step reached in play from New game:** election night and the morning after, then a loss. No played run has yet won a seat or proposed an ordinance from New game. Source: the CTO's status of Oct 28, 04:40 UTC (`docs/coordination/LEADS-2026-10-24.md`), the newest furthest-step line on record. It hasn't been measured on main since then; Lane 1's paths take that over.
- **A new game opens and plays a month:** Nov 3, in four drawn towns (Old Forge, New York, replay number ab5f58e9be125c95; Acres Green, Colorado, 5660878e1d1a5a27; Winfield, Iowa, fb6c084e9a388aaf; Johnstown, Colorado, 2cc2572dee6151a5), with `npm run new-game-check` from #7141, on main a8ffdc7878.
- **Oldest open pull request:** #7036, opened Nov 1 (GitHub's open list, Nov 3 22:25 UTC).

## Newest build

- Version **0.75.0** (`package.json` on main; release commit 7b5c3726, "Release 0.75.0").

## Who owns what

- Five lanes since Nov 3 (`docs/lanes/README.md` and `lane-1.md` to `lane-5.md`, on branch `docs/lanes-nov3`, PR #7139, until it merges). The owner's six rulings of Nov 3 hold (`docs/coordination/OWNER-DECISIONS.md`).
- `docs/coordination/CREW.md` describes the crew as of Nov 1 and doesn't yet show the lanes.

## The pool

- Counts are on line 5 of `docs/pool/INDEX.md` on main.
- Truth pass, Nov 3, against GitHub's open pull requests at 22:25 UTC (main commit f429f50bb6; each item's Notes says what changed):
  - 7 claimed items whose PR was already open were set in-pr: #7061, #7074, #7095, #7096, #7097, #7100, #7105.
  - `play-stop-12-status-card-covers-menu-after-canvass` is done: the owner closed #6971 with "its pool item is finished".
  - 4 claims released under the 48-hour rule, branches kept: `words-scene-web-meeting-pass-1`, `words-scene-web-the-campaign`, `words-scene-web-legislating` (last pushes Oct 27) and `people-home-plates` (Oct 30).
  - 56 open items still named an old claim; the claim was moved into each item's Notes (same commit, f429f50bb6).
- Four items read in-pr for PRs that merged on Nov 3 (#7083, #7087, #7088, #7104); the done-on-merge workflow (`.github/workflows/pool-done-on-merge.yml`) flips them.

## Roadmap flags

- `docs/roadmap/features.json` is the record. A flag flips only on its command passing in a drawn place (`roadmap-m0-flip-proven-five`). Nothing was flipped in this pass.

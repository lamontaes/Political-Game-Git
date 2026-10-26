---
id: play-bench-card-intercepts-calendar-pointer
title: "Keep the player card from blocking Calendar pointer clicks"
area: play
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr: #6051
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The Calendar ring is visibly present but cannot be opened with an ordinary pointer click after a new game. Fresh real-browser run on main-integrated #5869 head 03a8dc54d1: New game with empty Place, Skip opening, then Calendar pointer click times out because section#card intercepts pointer events. South Windham Maine; seed 3c088861-ddf4-4043-be35-04578d107721; viewport 1440x1000.

**Rules.** Wire to the world: verify the actual bench in a fresh world drawn from all 56 places using real pointer and keyboard controls; preserve the player card and Calendar actions. Diagnose on current main; do not bypass hit testing with forced or DOM clicks.

**Done when.** A fresh drawn-place game at 1440x1000 opens Calendar with an ordinary pointer click after Skip opening, keyboard access also works, and an inspected native screenshot plus full seed/place and no page errors are recorded.

**Files.** src/bench/play.css, src/bench/play.html, src/bench/play.mjs

**Notes.** Merger 1 discovered 2026-10-24 while checking #5869; unrelated to its docs-only diff. Playwright log: section#card.panel.me intercepts pointer events on #rings [data-tab=calendar].

Merger 3, Oct25: fresh #5971 review at code dcde7bf145, Brookside Delaware, seed 1efe077a-1d53-4ff3-a932-f94aeda0b7c5, reproduces the shared card collapsing to132px at1024x768 with text/time controls over menu icons; desktop minWidth is960 and .me max-width calc(50vw - 380px) is unchanged on main. Native screenshot: https://github.com/lamontaes/Political-Game-Git/blob/ac759eed0ad786c96938696b988e40451886a5d5/docs/reports/job-offer-hold-2026-10-25/merger-held-1024x768.png. Keep normal hit testing and include narrow supported windows in the repair.

Merger 1, Oct 25 23:28 UTC: independently reproduced the same card/pointer interception on both clean main 137c12ddb1 and #6065 local integration dcaf5c6824, Blairsville Georgia, seed 38cc4d86-fab6-4962-8ceb-d8608a642bef, viewport 1440×900, custom adult Pat Candidate. section#card h2#card-name intercepts the Politics ring. No forced/DOM click. Native screenshots and logs retained under merger1-state/6065-2313/browser (base-failure.png). Existing owner #6051 retained; no duplicate item.

Sent back 2026-10-26 from PR #6051 (branch claude/quirky-ride-vrwwz4-play-stop-12): Current-main integration conflicts in card.browser.mjs and three card PNGs; the shared layout landed through #5971, but this linked item still needs its stated 1440x1000 fresh pointer/keyboard acceptance reconciled and recorded without bypassing hit testing.; finish on that branch, merge main into it first.

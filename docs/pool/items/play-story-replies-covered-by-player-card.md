---
id: play-story-replies-covered-by-player-card
title: "Keep story reply controls clear of the player card after an outing"
area: play
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: claude/quirky-ride-vrwwz4-play-stop-07
pr: #6059
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-26T08:43:24.711Z
---

**What.** The player card covers part of the filing story reply row after a campaign outing. Merger 3 reproduced it in Cacao, Puerto Rico, seed b32f52ab-ec06-46ae-8e53-7482696bb81a, while reviewing PR 6059 at code 840e09f4e3 and viewport 1440x900. The clock browser check passes, but the native held-state screenshot shows response controls obscured beneath the card. Preserve the clock repair while making every story response readable and reachable.

**Rules.** Wire to the world: verify the real generated filing story with pointer and keyboard controls rather than forced clicks. Browser visual acceptance stops on visible overlap even when automated checks pass; preserve the player card, clock and story responses.

**Done when.** In a fresh drawn-place game, a campaign outing that stops for a filing story shows all response controls clear of the player card at 1440x900 and 1024x768. Native screenshots are inspected, the place and full seed are recorded, and pointer plus Tab and Enter or Space can activate every visible response without forced or DOM clicks or console errors.

**Files.** src/bench/play.css, src/bench/play.html, src/bench/play.mjs, src/bench/clock.browser.mjs

**Notes.** Merger 3, October 26: native failure image committed on PR 6059 at f36614b92ee9d833e846e935952fd14c9dbe6ab5, docs/reports/day-morning-2026-10-26/merger3-held-1440x900.png; exact filing story record is in the PR review evidence.

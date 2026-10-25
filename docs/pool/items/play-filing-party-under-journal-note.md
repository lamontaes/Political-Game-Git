---
id: play-filing-party-under-journal-note
title: "The journal note covers the party picker on the filing panel"
area: play
kind: bug
priority: 1
size: S
status: claimed
claimed-by: claude/quirky-ride-vrwwz4-play-stop-04
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-25T16:17:52.101Z
---

**What.** A bounded part of play-stop-04-filing-panel-runs-off-screen. On main the filing panel fits a 1440 by 900 window and its stands scroll inside it (For and Against menus), but the journal note in the bottom-right corner sits over the panel's Party row, so the party picker cannot be seen or clicked while filing (bench, Bushnell, Illinois, new life seed 55dcf8fb-9b25-49b0-a04a-1e3997a3e172). The news card is already hidden while the panel is open (src/bench/play.css, #game.filing-open #news-surface); the journal note is not.

**Rules.** This is a game, not a spreadsheet: choosing a party and a platform is the player's act at filing and must be reachable. Keep normal hit testing; no forced clicks.

**Done when.** On the bench in a drawn place at 1440 by 900, with the filing panel open, every stand's menu and the party picker are the topmost element at their own centers (src/bench/filing.browser.mjs), and the check fails with the old styles; place and seed named.

**Files.** src/bench/play.css, src/bench/filing.browser.mjs

**Notes.** TODO

---
id: play-filing-party-under-journal-note
title: "The journal note covers the party picker on the filing panel"
area: play
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr: #6052
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** A bounded part of play-stop-04-filing-panel-runs-off-screen. On main the filing panel fits a 1440 by 900 window and its stands scroll inside it (For and Against menus), but the journal note in the bottom-right corner sits over the panel's Party row, so the party picker cannot be seen or clicked while filing (bench, Bushnell, Illinois, new life seed 55dcf8fb-9b25-49b0-a04a-1e3997a3e172). The news card is already hidden while the panel is open (src/bench/play.css, #game.filing-open #news-surface); the journal note is not.

**Rules.** This is a game, not a spreadsheet: choosing a party and a platform is the player's act at filing and must be reachable. Keep normal hit testing; no forced clicks.

**Done when.** On the bench in a drawn place at 1440 by 900, with the filing panel open, every stand's menu and the party picker are the topmost element at their own centers (src/bench/filing.browser.mjs), and the check fails with the old styles; place and seed named.

**Files.** src/bench/play.css, src/bench/filing.browser.mjs

**Notes.** TODO

Sent back 2026-10-25 from PR #6052 (branch claude/quirky-ride-vrwwz4-play-stop-04, checked c77b1fd41a): local filing.browser.mjs:139 timed out waiting for the adult Politics Join button in Munds Park, Arizona, seed 51c5387b-6f46-4375-9b21-7065414b718c, so the filed party/platform Done-when was not reached; line 175 also permits fewer than two selected stands. Both image tags were repaired, but the existing owner screenshot hold remains; finish on that branch, merge main into it first.

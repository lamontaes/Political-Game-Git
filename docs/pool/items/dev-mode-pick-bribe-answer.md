---
id: dev-mode-pick-bribe-answer
title: "Dev mode can pick a bribe's answer through the game's own chooser"
area: play
kind: feature
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** corruption.ts decide scores the offerer's and the official's yes and no and takes the engine's choice, so dev mode's bribe control only reports what the engine decided. The Nov 8 brief asks that dev can also pick the answer. Reuse the controller the day loop already offers (the dev choose path), so the pick is a decision the person made and carries the reasons the engine keeps.

**Rules.** Ask why: a picked answer leaves a decision record that names it as a dev pick beside the engine's reasons.

**Done when.** In a drawn place, dev picks Taken for a refusing official, the crime record shows taken true with the reasons and a dev-mode mark, and the money moves through the game's own payment; a test names the place and seed.

**Files.** src/core2/modules/corruption.ts, src/bench/dev-mode.ts

**Notes.** TODO

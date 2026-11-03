---
id: tests-plain-text-no-travel-filing-place
title: "plain-text.browser.mjs finds no place in Travel that takes filings (Junction City, Georgia)"
area: play
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** On a fresh bench on Nov 3, src/bench/plain-text.browser.mjs failed with 'no place in Travel takes filings' in Junction City, Georgia (seed a3b686cb-ba71-4137-957b-a2e414912b99), after playing the President's address. Either Travel no longer marks the filing office of that place, or the check reads a label the Travel card changed on Nov 3 (play-travel-place-card-says-what-you-do merged that day). The cause is not yet found.

**Rules.** One rule, all 56 places: the filing office must be reachable from Travel in every place, and the check must find it the way a player does. Ask why: the fix names the record or label that changed, by file and line.

**Done when.** plain-text.browser.mjs passes in Junction City, Georgia on its seed and in two more drawn places named with seeds, and the PR names whether Travel or the check was wrong, by file and line.

**Files.** src/bench/plain-text.browser.mjs, src/bench/travel.ts

**Notes.** TODO

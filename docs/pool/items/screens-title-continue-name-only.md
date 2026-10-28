---
id: screens-title-continue-name-only
title: "Continue on the title menu shows its name only, not the saved life under it"
area: play
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The owner ruled on Oct 27: remove the menu subtitles and do not replace them; Continue, Saved games and Patch notes show only their names. With a saved life, Continue still shows a line under its name, for example Pat Candidate, 44, Southeast Arcadia, Florida, written by play.mjs into front-continue-life. The subtitle PR removed only the lines under dimmed entries.

**Rules.** Replace, never layer: the front-continue-life element and the code that fills it are deleted, not hidden. No hand-written player text in code: the title entry is its name alone, read from the kit's menu part.

**Done when.** src/bench/clock.browser.mjs passes on a restarted bench in a drawn place with the place and seed named in the PR body; its title check, which reads every title entry once a life is saved, finds no text beyond the entry's name; a before and after screenshot of the title menu is in the PR body.

**Files.** src/bench/play.mjs, src/bench/play.html, src/bench/clock.browser.mjs

**Notes.** TODO

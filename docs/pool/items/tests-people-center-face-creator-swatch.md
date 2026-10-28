---
id: tests-people-center-face-creator-swatch
title: "people-center-face.browser.mjs waits forever for a clothes swatch the creator no longer shows"
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

**What.** people-center-face.browser.mjs on main (Oct 28, Shelley, Idaho) times out waiting for [data-testid=engine-appearance-clothes-color] [data-swatch=red] in the character creator, so it never reaches People.

**Rules.** A check drives the screens a player sees today; never skip or disable it.

**Done when.** people-center-face.browser.mjs passes on three drawn places with each place and seed named, picking a look through the creator's current controls.

**Files.** src/bench/people-center-face.browser.mjs

**Notes.** TODO

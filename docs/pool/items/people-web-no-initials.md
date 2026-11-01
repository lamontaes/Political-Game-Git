---
id: people-web-no-initials
title: "The People map shows an empty ring, never initials, for someone with no figure"
area: people
kind: bug
priority: 2
size: S
status: done
claimed-by:
pr: #6842
blocked-on:
source: added with npm run pool -- add
---

**What.** On the People map a brother and sister drew as letters in a ring (GS, TS) instead of faces (CTO report, Altamont, New York, Oct 29 bench). The owner ruled no initials, ever (Oct 28). A child has no figure because the pack paints adults only (stopgap SG-PLAY-people-pack-six), so the map must show an empty ring until the figure exists, the way list rows already do.

**Rules.** Replace, never layer: the initials branch in ui/people-web.mjs and every .people-initial style in play.css are deleted in the same change, not kept beside the ring; Placeholders: the empty ring stands for a figure the pack does not paint yet, under the registered stopgap SG-PLAY-people-pack-six.

**Done when.** In a drawn place from all 56 (name the place and seed), people.browser.mjs opens People and fails if any face on the map is not a picture or an empty ring; it passes, and a screenshot of the map with a child shown as an empty ring is in the PR body.

**Files.** src/bench/ui/people-web.mjs, src/bench/play.css, src/bench/people.browser.mjs

**Notes.** TODO

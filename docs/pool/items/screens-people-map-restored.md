---
id: screens-people-map-restored
title: "People map as the owner liked it: colors per kind, visible lines"
area: play
kind: bug
priority: 1
size: S
status: done
claimed-by: screens/people-map
pr: #6489
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T02:33:44.551Z
---

**What.** The owner, Oct 28, on the People screen, relayed by the CTO at 01:05 UTC: restore the earlier people map he liked, with colors per kind of person and visible lines. Today every line is a thin gold hairline and faces sit in square boxes.

**Rules.** Restore, don't redesign: the earlier web's ring faces and edge colors (git 29be9982f5^, PeopleRelationshipWeb and people-web.css). Lines only from records. No hand-written player text.

**Done when.** People draws each face in a ring of its kind's color with a visible line in the same color, household members joined to each other, names clear of the lines, people.browser.mjs and no-scroll.browser.mjs passing, and before and after screenshots from drawn places.

**Files.** src/bench/play.mjs, src/bench/play.css

**Notes.** TODO

Oct 29 (CTO): set done; PR #6489 merged (the done flip failed while branch protection refused the flip job's push).

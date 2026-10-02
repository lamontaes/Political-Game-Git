---
id: home-rent-and-nonhousing-play
impact: patch
section: Improved
title: Home play script checks rent and nonhousing payments together
---

The records play script checks that a household pays recorded rent and the
sourced nonhousing estimate as separate flows on the same due date. It preserves
each payment on reload and refuses duplicate settlement. Missing HUD rent data
still creates no lease. Actual personal bill contracts and ordinary screen
follow-through remain unfinished play-script steps.

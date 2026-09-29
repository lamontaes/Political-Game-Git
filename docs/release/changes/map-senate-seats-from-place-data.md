---
id: map-senate-seats-from-place-data
impact: patch
section: Fixed
title: The map reads each place's Senate seats from the place table
---

The political map knew that the District of Columbia has no senators only
because its code named the District. It now reads the rule from the table of
places that send a nonvoting member to the House, so the District and every
territory show "has no seats in the U.S. Senate" by the same rule, and each
place's name comes from the same place table.

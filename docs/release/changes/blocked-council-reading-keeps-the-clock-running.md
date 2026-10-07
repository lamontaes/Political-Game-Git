---
id: blocked-council-reading-keeps-the-clock-running
impact: patch
section: Fixed
title: A council reading that cannot be voted no longer stops the calendar
---

When a council or county board could not take a scheduled reading, because no
seated member could decide it or the vote was refused, passing time failed with
an error instead of recording the block. The reading is now recorded as blocked
with its reason and the calendar moves on.

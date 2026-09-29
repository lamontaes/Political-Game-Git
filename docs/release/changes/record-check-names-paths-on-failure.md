---
id: record-check-names-paths-on-failure
impact: patch
section: Improved
title: Checking each day's new records costs less
---

After each stretch of days, the game checks that every new record can be
saved. That check wrote out the full location of every nested value it
looked at, whether or not anything was wrong. It now writes a location only
for a value that fails, with the same message as before. In South Fork,
Pennsylvania, each of the first ten game years runs 0.3 to 6.4 seconds
faster, and the world after each year is exactly the same as before.

---
id: time-passes-faster-in-long-saves
impact: patch
section: Fixed
title: Letting time pass is about twice as fast, and long saves no longer slow to a crawl as quickly.
---

Every scheduled thing that happened as time passed used to re-check the whole
world after each small change it made, so each year took longer than the
last. The world is now checked once per scheduled event instead. A year in a
new Kentucky life went from 36 seconds to 18, and the saved result is exactly
the same as before.

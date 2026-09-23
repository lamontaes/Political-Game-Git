---
id: mutation-proof-without-copying-the-save
impact: patch
section: Fixed
title: Long saves in the development build, and the test suite, no longer slow down year after year from a safety check.
---

The development build and the test suite prove that no scheduled event
rewrites the world it was given. That proof used to copy the whole save to
text twice for every scheduled event, so each year of a long save cost more
than the one before. It now freezes the world instead and walks only the
records added since the last check. On the same watched world, year 3 went
from 18.4 seconds to 2.0, and year 20 takes 16.5 seconds where watched runs
measured about 330. Saves are byte-identical to before.

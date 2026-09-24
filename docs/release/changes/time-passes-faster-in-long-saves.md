---
id: time-passes-faster-in-long-saves
impact: patch
section: Fixed
title: Letting time pass is many times faster, and long saves slow down far less as they age.
---

Every scheduled thing that happened as time passed used to re-check the whole
world after each small change it made, and then copy the whole save twice to
prove nothing had been altered behind its back. So each year took longer than
the last. The world is now checked once per press of the clock, and the
whole-save copy runs only in development and tests. On a four-year Columbus
save, twelve weeks of play went from 68 seconds to under 6, and the saved
result is byte-for-byte the same as before.

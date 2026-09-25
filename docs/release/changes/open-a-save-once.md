---
id: open-a-save-once
impact: patch
section: Fixed
title: A big save opens in less than a third of the time and half the memory.
---

Opening a save used to read the whole world twice, copy it, and write it out again three times to check it. The check now reads the world once and hands that same world to the game, and it no longer copies it. It also remembers the world's identity instead of recomputing it. On Julia Griffith's 92 MB Casper save, opening went from about 20 seconds to 6, and the extra memory it needed from about 1.9 GB to 0.8 GB. That is the pressure that crashed browser tabs holding big saves.

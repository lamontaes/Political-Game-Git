---
id: every-simulation-gets-the-speed-up
impact: patch
section: Fixed
title: Watching a world, and every scripted run, gets the long-save speed-up too.
---

A world nobody is playing, and every scripted playtest, now passes time as
fast as the player's own clock. In an observed Columbus save the second year
took 31 seconds and now takes about 3. Day-by-day advances check the world
once at the end instead of after every change, and only the test suite and
development builds keep the slow proof that no scheduled event rewrites the
world it was given.

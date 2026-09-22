---
id: an-empty-governorship-no-longer-stops-the-clock
impact: patch
section: Fixed
title: A life no longer freezes when a governorship has nobody on record
---

When a state's field closed for a governor's race and the game had no sitting
governor on record, writing down that nobody was standing again failed, and
that failure happened inside the day advance. Time could not move past that
day: pressing "Let the year run on" did nothing, every time. A Lexington
childhood stopped for good in July 2030.

The decision is now recorded against the state itself when the seat is empty,
and the year runs on.

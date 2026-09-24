---
id: prose-tools-load-the-simulation-again
impact: patch
section: Fixed
title: The prose tools load the simulation again
---

Nothing changes for the player. The development prose tools had stopped
starting: reading how long two people have been apart pulled in the whole
contact engine, which made a loop of files that the tools' loader could not
untangle. The names of the contact records now live in a file of their own,
and a test loads the whole simulation the way the tools do.

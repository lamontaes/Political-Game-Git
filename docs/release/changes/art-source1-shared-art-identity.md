---
id: art-source1-shared-art-identity
impact: patch
section: Fixed
title: The browser and the installed game now show the same people
---

The installed game loaded its selected artwork at startup. A browser did not, so the same save opened in a browser could draw a different cast than the installed game drew from the same artwork, with nothing on screen to say which one you were looking at. Both now read the same artwork the same way.

Two ways the game could quietly mix one generation of people with another are closed. Artwork the selected pack does not contain is now reported as missing by name, instead of being filled in from whatever older artwork the folder still held, so a figure can no longer be assembled out of two generations at once. Saved games are unaffected either way.

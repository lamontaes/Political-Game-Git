---
id: map-national-pack-browser-load
impact: patch
section: Fixed
title: The government map draws again
---

The national map loads through the same browser path as each state's map, so Politics → Government → Map draws the country again. It had failed with "The map geometry could not be loaded" after a JSON import attribute was added to its loader.

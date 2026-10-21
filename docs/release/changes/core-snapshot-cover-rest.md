---
id: core-snapshot-cover-rest
impact: patch
section: Improved
title: Restoring a saved world keeps each record as saved, and 47 more engines declare their state saved
---

Restoring a saved world used to put some shared records back wrong, so one person's history could overwrite everyone's. Each record now comes back as it was saved, and 47 more engines declare their state saved. Six engines are still unsaved (jobs and the three office-day engines, candidacy and news), so loading still replays the game from the opening for now.

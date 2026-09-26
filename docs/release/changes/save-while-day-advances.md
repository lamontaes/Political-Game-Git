---
id: save-while-day-advances
impact: patch
section: Fixed
title: Saving no longer rewinds a day pressed while the save is in progress.
---

If you press **Day** while **Save** is still in progress, the newer day stays in
the game and reaches the following autosave.

The existing browser save format is IndexedDB database version 4 and record
version 4; large snapshots use chunk rows. This build still reads saved-world
records from versions 1 through 4, including version 3. An older build that
requests database version 3 cannot open a database after it has been upgraded
to version 4; IndexedDB rejects that open, but the saved data is left untouched.
Reload with the current build to continue.

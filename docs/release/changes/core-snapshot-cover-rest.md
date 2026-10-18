---
id: core-snapshot-cover-rest
impact: patch
section: Improved
title: A saved game restores exactly, and most engines no longer force a replay
---

Loading a saved game used to put some shared records back wrong, so a person's history could change on load. Restoring now keeps each record as it was saved, and most engines declare their state saved, so loading does not have to replay the game from the opening.

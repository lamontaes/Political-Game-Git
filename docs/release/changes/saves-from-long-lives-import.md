---
id: saves-from-long-lives-import
impact: patch
section: Fixed
title: A long life's exported save can be imported again
---

Importing a save refused any file over 8 MiB with "That file is larger than a
saved life is allowed to be." Long lives exported from play measure up to 91.6
MB, so they could be exported but never brought back. The limit is now 256
MiB, and the Save screen and the importer read it from the same place.

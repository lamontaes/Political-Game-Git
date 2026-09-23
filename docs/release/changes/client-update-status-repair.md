---
id: client-update-status-repair
impact: patch
section: Fixed
title: Correct update status and reuse the update workspace
---

The private game client recognizes an installed update instead of asking you to
press a missing install button. Installation shows progress and explains when
it cannot finish, so you can retry.

Compatible game updates reuse one preparation folder instead of creating
another project copy each time. Unchanged verified dependencies and valid
compiler cache are reused while update verification remains in place.

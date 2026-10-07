---
id: rs-2162-confirmed-empty-saves
impact: patch
section: Changed
title: Disable the saved-games action for a confirmed empty store
---

The Saved games action is disabled after the saved-life store confirms that it
contains no saved lives. Loading, failed reads, outdated stores, and retained
set-aside saves keep their existing behavior.

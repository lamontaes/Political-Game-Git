---
id: release-main-red-scan-dir
impact: patch
section: Fixed
title: Release builds publish again
---

The build step that checks the shipped game for forbidden data now creates its
report folder on a fresh checkout, so the desktop release package builds
again instead of stopping on a missing folder.

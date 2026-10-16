---
id: release-apply-enobufs
impact: patch
section: Fixed
title: The release gate on main finishes again
---

The release gate on main finishes again: the release writer no longer overflows when the release notes get long, and a new push waits for the running check instead of cancelling it.

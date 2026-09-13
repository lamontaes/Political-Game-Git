---
id: d33-private-controller-background
impact: patch
section: Fixed
title: Play remains available while private updates are checked
---

The private Mac controller can check and stage compatible updates in the
background without blocking Play. Automatic checks can be turned off and that
choice is remembered. Update status distinguishes the actual installed build
from its release label, and a staged update waits for the game to close normally
before it can be activated.

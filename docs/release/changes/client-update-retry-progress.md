---
id: client-update-retry-progress
impact: patch
section: Fixed
title: Show progress when retrying a failed update check
---

Retrying an update check now shows the new attempt's progress instead of keeping
an earlier offline or failure message on screen while preparation is running.
A failure in the new attempt remains visible and the current game stays playable.

Canceling background preparation is reported as canceled, with the current game
retained, rather than showing a generic failure after a safe cancellation.

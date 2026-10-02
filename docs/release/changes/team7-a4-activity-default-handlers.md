---
id: team7-a4-activity-default-handlers
impact: patch
section: Fixed
title: Scheduled activities use the complete clock job list
---

Joining, completing the remaining interval or performing a scheduled activity uses the same existing complete scheduled-job registry as the minute clock by default. Explicitly supplied registries keep their current behavior.

The Calendar regression uses the actual recorded completed-work event as its interval provenance.

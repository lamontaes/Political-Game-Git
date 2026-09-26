---
id: clock-advances-reuse-validated-history
impact: patch
section: Fixed
title: Long lives spend less time checking unchanged history
---

Day and Week advances now reuse validated, unchanged records and resolve due work through the same clock. Observer Run still updates between individual weeks so it can be paused. The game checks the whole world when it saves.

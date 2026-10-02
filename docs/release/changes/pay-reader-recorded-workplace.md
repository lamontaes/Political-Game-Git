---
id: pay-reader-recorded-workplace
impact: patch
section: Fixed
title: Pay reads regional wage rules at the recorded workplace
---

The saved hourly-pay caller now supplies its recorded workplace's canonical
place key to the existing regional wage reader. It does not use the worker's
home as a workplace or infer missing regional boundaries.

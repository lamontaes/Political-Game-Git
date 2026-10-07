---
id: team9-a131-exposure-date-bound
impact: patch
section: Fixed
title: Crime exposure avoids constructing dates outside its requested window
---

The existing crime exposure clock checks whether an offense is due within the requested span before constructing its date. Tiny positive rates can therefore leave a valid month empty without failing on a distant ISO date. The producer's rates, recorded count, replay, and actual sample writers are unchanged.

---
id: justice-law-exposure-single-writer
impact: patch
section: Fixed
title: Record each court outcome once in a defendant's law history
---

The law-consequence registry reuses the existing pretrial and sentencing exposure writers. A court outcome no longer produces duplicate law-history records when both prosecution and consequence dispatch handle it.

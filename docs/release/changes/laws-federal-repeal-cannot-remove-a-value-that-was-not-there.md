---
id: laws-federal-repeal-cannot-remove-a-value-that-was-not-there
impact: patch
section: Fixed
title: Repealing a law returns the body to exactly the law it had before, including none
---

Repealing an amount law (a tax rate, a wage floor, a limit) now ends the law the body passed instead of writing a zero in its place, so a level that had no law of its own before is silent again and the next level's law governs as it did, and a level that had one is back to that same law.

---
id: schools-state-line-moves-graduation
impact: patch
section: Fixed
title: Where a state runs its schools, a change to its schools line moves graduation.
---

In a state that runs its schools as one system, a town has no city or county schools line, so a raise to the state's schools line moved nothing there. The school engine now reads the state's line against its own base when no city or county line exists.

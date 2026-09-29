---
id: traits-seeded-on-their-own-date
impact: patch
section: Fixed
title: People's temperaments are written again when a world starts
---

The step that writes each person's temperament had lost the date it records
them on, so any world that seeded new people stopped with an error. The date
now reaches that step again.

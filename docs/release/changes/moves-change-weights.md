---
id: moves-change-weights
impact: patch
section: Fixed
title: Households that move in or out of a county change how many households a record stands for, so the county's records stop multiplying.
---

A household that moves in joins a record of households that arrived like it, and one that moves away lowers its record, instead of every move adding or removing a record of its own.
Long games no longer slow down year after year as the county's household records pile up.

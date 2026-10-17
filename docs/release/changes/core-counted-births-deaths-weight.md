---
id: core-counted-births-deaths-weight
impact: patch
section: Fixed
title: A town opened at its full Census size now has births and deaths at the real rate
---

In a town opened with each counted household standing for several real ones, the wider population's births, illnesses and deaths were counted once per household record, so a big town had far too few. They now follow the real people each household stands for, and a baby or a death in a record counts for all of them.

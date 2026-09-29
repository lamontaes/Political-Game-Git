---
id: unincorporated-town-size-shapes-principles
impact: patch
section: Fixed
title: People in unincorporated towns now form principles from their town's size
---

A person's principles take a pull from the size of the town they live in, but
the size was read only from the annual Census estimate, which covers
incorporated places alone. In census-designated towns, such as
Gallipolis Ferry, West Virginia, the town had no size, so small-town and
big-city pulls never formed. The size now falls back to the American Community
Survey count the public budgets already use.

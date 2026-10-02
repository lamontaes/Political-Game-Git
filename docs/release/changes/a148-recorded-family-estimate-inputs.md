---
id: a148-recorded-family-estimate-inputs
impact: patch
section: Changed
title: Recorded family estimates retain their game inputs
---

A pure family reader reports averages and population spread from the game's
saved kinships, with contributor people, relationship IDs and existing birth
dates. Its samples distinguish recorded family links from missing links; it
creates no people or birth dates. Opening-family generation now reuses the
recorded pattern nearest these averages and estimates whole-year intervals
from saved parent ages, rather than rolling external percentages or ranges.
Generated family links retain the estimate label and compared record IDs;
missing age evidence does not create a guessed birth date.

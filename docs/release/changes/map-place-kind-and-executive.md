---
id: map-place-kind-and-executive
impact: patch
section: Fixed
title: The map calls territories territories and names each place's executive
---

Selecting Puerto Rico, Guam, the U.S. Virgin Islands, American Samoa or the
Northern Mariana Islands on the political map labeled it a "State". The label
now reads "Territory", and the District of Columbia reads "Federal district",
both from the place table rather than a check on one place's code. The top
executive's title comes from the same table: the District's Mayor, and a
Governor everywhere else.

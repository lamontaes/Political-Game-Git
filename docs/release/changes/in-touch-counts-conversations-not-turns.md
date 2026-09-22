---
impact: patch
id: in-touch-counts-conversations-not-turns
section: Fixed
title: In touch counts conversations, not turns
---

A private aim aimed at a person reported how often the player had been in
touch since setting it. It counted relationship interactions, and a
conversation writes one of those for every turn that changes anything between
the two people, all of them on the day it happened. So one conversation that
ran three turns told the player they had been in touch three times.

It now counts the days on which contact actually happened. One conversation is
once, however long it ran.

The nearby test that checked what a household conversation records began by
returning early if nothing had been recorded at all, which is the same as not
checking. It now requires the interactions it goes on to inspect.

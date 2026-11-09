---
id: desk-stale-entry
impact: patch
section: Fixed
title: A desk entry that is no longer waiting redraws the desk instead of failing
---

On the desk (hearings, orders, the budget request), pressing a button for an entry that was no longer waiting, because the day had moved or another stop cleared it, raised an error and left the stale entry on screen. The desk now redraws from what is waiting at that moment.

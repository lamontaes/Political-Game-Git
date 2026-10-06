---
id: saved-voting-precinct-membership
impact: patch
section: Added
title: Save population-based voting precinct membership
---

The existing geographic membership writer can save voting precinct assignments
from Census population shares. Arrivals keep prior residents' assignments, and
census reviews use the existing redistricting step. Missing source coverage keeps
an explicit estimate from compiled averages.

Replaces: no saved voting precinct membership producer. Opening and movement
consumer registration, precinct counts and election-night scenes remain separate.

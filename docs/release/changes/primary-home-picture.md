---
id: primary-home-picture
impact: patch
section: Fixed
title: Keep the home picture tied to the primary dwelling
---

The home picture reads the saved primary dwelling through the shared query.
A later secondary occupancy or an occupancy without matching active tenure
cannot replace that picture. When no primary dwelling is recorded, the existing
household picture and generic fallback remain.

Replaces: place-backdrops.ts inline primary home selection.
New exports: none. Weather and housing writers keep their existing behavior.

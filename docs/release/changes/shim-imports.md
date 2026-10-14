---
id: shim-imports
impact: none
section: Changed
title: Internal imports now point at the core modules directly
---

The four old re-export files under the simulation folder were removed, and every import now goes straight to the core module it pointed to, with no change to what the game does.

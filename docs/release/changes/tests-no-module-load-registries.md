---
id: tests-no-module-load-registries
impact: none
---

One old-engine handler list is now built when first needed instead of while modules load, so the guard against load-time registries passes. Nothing changes in the game.

---
id: art7-view-fallback
impact: patch
---

When a person's requested side or back view lacks a complete set of art, the
renderer uses a complete three-quarter view before falling back to front.
The person's requested left or right direction follows the view that is drawn.

---
id: person-white-matte-edges
impact: patch
section: Fixed
title: Faint white person edges borrow their own opaque layer color
---

Garment assembly replaces faint near-white edge colors with the nearest opaque
color within two native pixels of the same layer. Original source rasters,
opaque artwork and every alpha value remain unchanged. Isolated edges without
an opaque neighbor retain their source color.

This candidate addresses the white-outline defect only. Actual same-person
intro comparisons and human art acceptance remain separate requirements.

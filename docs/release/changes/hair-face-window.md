---
id: hair-face-window
impact: patch
section: Fixed
title: Front afro hair keeps an explicit candidate face window
---

The existing front afro style has a candidate face window bound to its original
source hash. Assembly derives the exclusion from the selected face's eroded
alpha within authored native rows. Scalp, bangs above the window, outer hair,
back hair, other styles and all original rasters remain unchanged.

The builder rejects a changed source hash rather than silently carrying the
window onto replacement artwork. The boundary is a candidate authored mask,
not recovered private-source metadata. Actual paired intro evidence and human
art approval remain required. Missing turned hair is not supplied by this fix.

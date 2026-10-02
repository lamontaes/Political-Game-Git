---
id: district-population-consumer
impact: patch
section: Fixed
title: Split-place district estimates use recorded population parts
---

A new split-place home estimate uses the largest recorded Census district
population part, with district identity breaking an equal count. It no longer
picks equally among crossing districts. Missing coverage and zero totals do
not invent a home assignment. Existing saved intervals remain unchanged.

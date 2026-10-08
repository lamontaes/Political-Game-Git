---
id: p2-rules-in-data
impact: patch
section: Changed
title: Jurisdiction rules read shared JSON tables
---

The legislative, executive, qualification, ethics, vacancy, court and opening-region readers now load their jurisdiction rows through one browser-safe JSON seam. Existing citations, dates, estimates, unsupported cases and rule values are retained. The qualification exporter writes JSON so regeneration keeps the data outside play code.

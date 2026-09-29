---
id: record-lookups-grow
impact: patch
section: Improved
title: Later game years run faster as legislative and news records grow
---

The game checks each new legislative record and each news story against
lookups built from every earlier record. Whenever any of those lists grew,
the lookups were rebuilt from the start, so each year cost more than the one
before. Each lookup now grows with its list. In South Fork, Pennsylvania,
game years one to five take 1.0, 1.4, 2.7, 9.6 and 3.6 seconds less.
Nothing that happens in the world has changed: the world after each of five
years is exactly the same as before.

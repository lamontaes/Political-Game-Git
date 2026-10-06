---
id: tracked-secret-scan
impact: none
---

Adds a scanner that checks tracked files for secret-like values, environment and
signing files, and private-key material, reporting only file paths and finding
categories. It runs with `npm run secrets:scan` and changes nothing in play.

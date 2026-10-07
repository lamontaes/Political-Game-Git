---
id: law-registry-loads-from-opening-life
section: Fixed
title: Law consequences load when a life opens
impact: patch
---

Opening a life could leave an empty slot in the list of law consequence handlers, because the policy pack loaded the library materials module before the list was finished. It now reads that module's data file, as the curriculum rule does.

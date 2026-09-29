---
id: meeting-tests-and-old-save-arrival
impact: patch
section: Fixed
title: An older save with the meeting journey already made can still attend
---

A save written before the Calendar journey recorded its arrival had the trip to the posted public meeting marked done and nothing placing the player in the room, so Attend refused forever. Attend now records the arrival that trip lacks, once, and opens the meeting from it. The tests that still expected one Attend to finish a meeting now walk in first and stay second, and the placeholder ledger, the literal census, the transfer preference and the opener heading match the game again.

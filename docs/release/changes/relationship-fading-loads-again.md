---
id: relationship-fading-loads-again
impact: patch
section: Fixed
title: The game loads relationship fading and the press together again
---

Relationship fading and meeting requests referred to each other in a loop, so any part of the game that loaded the press or relationships could stop before it started. The shared name now lives on its own, and both load in any order.

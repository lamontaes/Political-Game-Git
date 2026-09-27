---
id: ordinary-opening-traits-one-integrity-check
impact: patch
section: Fixed
title: Ordinary lives open faster with the same reachable contacts
---

Opening an ordinary life now records reachable contacts' traits in one validated batch. The contacts and their saved traits stay the same, while the game avoids repeating a full World check after each trait. A failed opening still restores the normal integrity boundary.

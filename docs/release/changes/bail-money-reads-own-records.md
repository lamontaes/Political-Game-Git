---
id: bail-money-reads-own-records
impact: patch
section: Improved
title: Deciding bail stays quick as the world ages
---

Each week, deciding bail asks every defendant how much money they have on
hand. When a defendant had no money account yet, that question read every
transfer the world had ever recorded and searched every payment arrangement
for each one. It now reads only the defendant's own payment arrangements and
transfers, from indexes that grow with those records, and gives the same
answers. The world after each game year is exactly the same as before.

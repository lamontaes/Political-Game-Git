---
id: prosecution-stage-deadlines
impact: patch
section: Changed
title: Prosecution stages record their own court deadlines
---

Saved referrals, charges and mistrials record the next case review on the existing clock. The court adapter reviews the actual named case and preserves its saved stage records.

An actual saved local trial-bench appointment rechecks that court's already-due pending cases. The opening/load recovery adapter reviews overdue cases at the current date, without backdating their original stages or adding a polling deadline. The weekly fallback remains until both replacement routes are proved in the composed game.

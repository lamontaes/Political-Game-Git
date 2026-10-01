---
id: price-cost-dated-final-terms
impact: patch
section: Fixed
title: Saved price activities use their own legal date
---

The price-cost consumer now passes the saved activity date to the canonical
final-law-term reader. A later observation cannot substitute another starting-law
phase for that activity. Requires the dated reader in foundation #1309. This
addresses part of audit gap A57; no new rate or production pricing row is added.

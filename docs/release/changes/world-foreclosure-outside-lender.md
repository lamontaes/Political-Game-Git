---
id: world-foreclosure-outside-lender
impact: patch
section: Fixed
title: A foreclosure on a loan the outside market holds no longer stops the game
---

When a home was foreclosed and the outside market both bought it and held its mortgage, the sale tried to move cash from the market to itself and stopped the game with an error. The loan is now settled without that transfer.

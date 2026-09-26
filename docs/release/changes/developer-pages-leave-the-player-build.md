---
id: developer-pages-leave-the-player-build
impact: patch
section: Changed
title: Developer pages no longer ship with the game
---

The game carried its developer pages inside the player build: the world
inspector, the causal trace, the content browser, the scene and character
proofs, the office fixture and the review hub. Adding `?view=developer` or
opening `review.html` on a released copy reached them. They are now left out of
the player build entirely and stay available in the development server and in
an internal review build. Opening the game is unchanged.

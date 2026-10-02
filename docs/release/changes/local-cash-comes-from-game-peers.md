---
id: local-cash-comes-from-game-peers
impact: patch
section: Fixed
title: Local governments without an opening profile use their game peers’ cash.
---

A local government without saved opening cash now starts from current cash in the game’s nearby population-sized government accounts. The estimate records its contributing accounts and their spread, rather than using forecast revenue or a fixed cash figure. The world’s own saved opening profile still takes precedence. Existing accounts and money stay intact, and repeating the opening after Continue creates no payment or extra balance.

The opening adapter now uses an actual compiled township and the existing local-government materializer to create its canonical jurisdiction before account admission. Multiple served places reuse that township account. Existing served-place accounts require a recorded ownership migration; they are not relabeled. The separate town-budget cash-reader join remains open.

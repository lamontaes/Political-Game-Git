---
id: session-110-player-ballot
impact: patch
section: Improved
title: Saved player ballots join the recorded voter count
---

The recorded-voter count accepts a saved player candidate choice or explicit abstention before considering that player's views, and returns named ballot receipts. A ballot projection offers named candidates and abstention and saves an explicit answer through the canonical event writer. Proposition ballots and the live election scene dispatch remain pending their shared interface; this change alone does not expose a playable ballot scene.

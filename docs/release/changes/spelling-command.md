---
id: spelling-command
impact: patch
section: Fixed
title: American spelling holds after other work lands
---

Words that came back in British spelling after the sweep (catalog, neighbor,
behavior, modeled, offense) are American again. `npm run spelling` now lists
anything the spelling check would flag, and `npm run spelling -- --write`
repairs it, so new writing can be put right in one step.

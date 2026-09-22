---
id: accepted-main-plays-runtime-artwork
impact: patch
section: Fixed
title: The private client keeps main's artwork when main's code moves on
---

The private client's updater now builds accepted main with the runtime artwork another track already plays, once main's code supports runtime art, instead of requiring an art pack pinned to one source revision. A code change on main no longer strands the owner's build on an older revision with its artwork refused as incompatible.

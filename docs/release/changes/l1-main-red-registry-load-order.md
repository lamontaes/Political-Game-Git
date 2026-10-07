---
id: l1-main-red-registry-load-order
impact: patch
section: Fixed
title: Opening a life no longer crashes when the people code loads first
---

The law registry could be built while a handler module was still loading, which left an empty entry and crashed the first law dispatch of a new life. The policy packs now read each module's small row file instead of the whole handler module, so the load order no longer matters.

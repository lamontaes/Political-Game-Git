---
id: newspaper-correction-test-setup
impact: patch
section: Fixed
title: Newspaper correction regression supplies its initial publication
---

The newspaper correction regression now records a public event and publishes it through the canonical writers before correcting the article. A fresh life has no published edition, so its empty newspaper is verified separately. The existing binding, correction identity, revision and read-only assertions remain intact, with saved-world reload coverage added.

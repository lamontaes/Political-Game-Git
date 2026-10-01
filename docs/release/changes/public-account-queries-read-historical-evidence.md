---
id: public-account-queries-read-historical-evidence
impact: patch
section: Changed
title: Public account queries can read dated ownership evidence
---

Public account queries can accept a saved date and sequence cutoff. They read
the organization and government profile visible then, while retaining the
existing current-query return shape. Ownership evidence includes the actual
organization and profile IDs. No account, legal power or recipient alias is
created. Saved municipal identity validation uses the same cutoff as account
ownership; account creation continues to validate the current identity.

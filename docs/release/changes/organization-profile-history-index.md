---
id: organization-profile-history-index
impact: patch
section: Fixed
title: Organization profile readings reuse the existing history index
---

Organization profile queries read the existing organization-keyed history index.
Date and sequence cutoffs remain unchanged, and only the filtered result is
sorted, preserving shared groups and earlier snapshots.

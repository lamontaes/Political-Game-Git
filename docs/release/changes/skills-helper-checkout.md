---
id: skills-helper-checkout
impact: none
section: Changed
title: Helpers work in sparse copies of the repository
---

A new skill and script give each helper a copy of the repository without its image files (about 0.9 GB instead of 3.3 GB), so helper copies no longer fill a session's disk; the secrets scan skips the files such a copy leaves out.

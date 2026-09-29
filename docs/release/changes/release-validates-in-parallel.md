---
id: release-validates-in-parallel
impact: none
---

The version number on the title screen had not moved past 0.4.0, because no
release had ever finished. The release check ran the whole test suite in one
job with a 40-minute limit, and the suite now takes longer than that, so every
release was stopped before it could publish.

The release now runs the same complete check split across parallel jobs, the
way the check on every pull request already does: one job for everything but
the unit tests, six for the unit tests, and a final job that confirms the six
covered the whole suite. It also confirms that the built game shows the new
number before anything is published. Nothing is checked less than before.

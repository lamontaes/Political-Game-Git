---
id: fixer-release-version-check
impact: none
---

The release workflow no longer looks for the version on the title (it is not there, by the owner's ruling). It checks that Patch notes, where the player sees the version, list the new release first and that `package.json` carries it. The desktop smoke test expects Continue hidden and disabled with no life saved.

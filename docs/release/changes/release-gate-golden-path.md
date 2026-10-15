---
id: release-gate-golden-path
impact: none
---

The release blocks on the build, typecheck, zero dice, the release declarations and the golden-path suite, not the whole unit suite; a newer push to main cancels a release only while it is still validating. Desktop packaging runs on pull requests only when the desktop shell changes.

---
id: enacted-duties-test-runs-to-effective-date
section: Fixed
title: Law-effect test checks the in-effect wording on the effective date
impact: patch
---

The enacted-duties test checked the "none has come under it yet" wording while the law was still scheduled, so it saw the scheduled wording instead. It now runs the clock to the effective date before checking.

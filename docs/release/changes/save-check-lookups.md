---
id: save-check-lookups
impact: patch
section: Fixed
title: Big saves load and pass a week faster.
---

The check that runs on every save used to search whole history lists record by record, over and over, so its cost grew with the length of a life. It now builds each lookup once per check. On a 65 MB Seattle save, one weekly press went from about 17 seconds to about 6, and loading went from about 10 seconds to about 5.5. The saved world is byte-identical.

---
id: release-press-counted-town-query
impact: patch
section: Fixed
title: Town stance retains its counted-resident reader after press changes.
---

Keep both existing counted-resident queries available to the press: town stance needs household and trait records, while audience counts use the smaller age-and-weight projection. This fixes the release build's missing import without changing either calculation.

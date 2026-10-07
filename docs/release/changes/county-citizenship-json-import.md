---
id: county-citizenship-json-import
impact: patch
section: Fixed
title: The browser tests load again
---

Before, the citizenship data file was imported without the JSON import
attribute, so no browser test could load.

Now it is imported the way every other data file is, and the browser tests load.

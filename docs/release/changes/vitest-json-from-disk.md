---
id: vitest-json-from-disk
impact: none
---

Test workers read JSON data files from disk instead of keeping them as module code, cutting a worker's starting memory from about 1,070 MB to 390 MB.
